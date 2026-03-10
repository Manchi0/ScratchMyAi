"""
Run from the backend/ directory:
    python test_pipeline.py
"""
from __future__ import annotations

import json
import sys
import io
import traceback
import os

# Add parent directory (backend) to sys.path so 'services' and 'supabase' can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import torch
import torch.nn as nn
from services.code_generator import pipeline_to_code, graph_json_to_code
from services.local_runner import (
    run_pipeline, build_model, convert_graph_json,
    resolve_connections, _parse_node,
)

GREEN  = "\033[92m"
RED    = "\033[91m"
CYAN   = "\033[96m"
YELLOW = "\033[93m"
RESET  = "\033[0m"

def ok(msg: str)     -> None: print(f"{GREEN}  PASS{RESET}  {msg}")
def fail(msg: str)   -> None: print(f"{RED}  FAIL{RESET}  {msg}")
def header(msg: str) -> None:
    print(f"\n{CYAN}{'-'*64}{RESET}")
    print(f"{CYAN}{msg}{RESET}")
    print(f"{CYAN}{'-'*64}{RESET}")

CASES: list[dict] = [
    # ── Basic MLP ────────────────────────────────────────────────────────────
    {
        "name": "MLP Classifier (784->256->128->10, softmax)",
        "pipeline": [
            {"type": "dataset", "data": [[float(i % 10) / 10 for i in range(784)]]},
            {"type": "linear",     "in_features": 784, "out_features": 256},
            {"type": "activation", "name": "relu"},
            {"type": "linear",     "in_features": 256, "out_features": 128},
            {"type": "activation", "name": "relu"},
            {"type": "linear",     "in_features": 128, "out_features": 10},
            {"type": "activation", "name": "softmax", "dim": 1},
            {"type": "output"},
        ],
        "expected_shape": (1, 10),
    },
    # ── Activations with params ───────────────────────────────────────────────
    {
        "name": "GELU + SiLU activations (16->32->8)",
        "pipeline": [
            {"type": "dataset", "data": [[float(i) for i in range(16)]]},
            {"type": "linear",     "in_features": 16, "out_features": 32},
            {"type": "activation", "name": "gelu"},
            {"type": "linear",     "in_features": 32, "out_features": 8},
            {"type": "activation", "name": "silu"},
            {"type": "output"},
        ],
        "expected_shape": (1, 8),
    },
    # ── LayerNorm ─────────────────────────────────────────────────────────────
    {
        "name": "LayerNorm (8->32->8)",
        "pipeline": [
            {"type": "dataset", "data": [[float(i) for i in range(8)]]},
            {"type": "linear",     "in_features": 8, "out_features": 32},
            {"type": "layernorm",  "normalized_shape": [32]},
            {"type": "activation", "name": "relu"},
            {"type": "linear",     "in_features": 32, "out_features": 8},
            {"type": "output"},
        ],
        "expected_shape": (1, 8),
    },
    # ── LSTM wrapper ──────────────────────────────────────────────────────────
    {
        "name": "LSTM sequence classifier (seq=10, input=16->hidden=32->linear->2)",
        "pipeline": [
            {"type": "dataset", "data": [[[float(j) for j in range(16)] for _ in range(10)]]},
            {"type": "lstm",       "input_size": 16, "hidden_size": 32},
            {"type": "linear",     "in_features": 32, "out_features": 2},
            {"type": "activation", "name": "softmax", "dim": 1},
            {"type": "output"},
        ],
        "expected_shape": (1, 2),
    },
    # ── GRU wrapper ───────────────────────────────────────────────────────────
    {
        "name": "GRU (seq=5, input=8->hidden=16->linear->1, sigmoid)",
        "pipeline": [
            {"type": "dataset", "data": [[[float(j) for j in range(8)] for _ in range(5)]]},
            {"type": "gru",        "input_size": 8, "hidden_size": 16},
            {"type": "linear",     "in_features": 16, "out_features": 1},
            {"type": "activation", "name": "sigmoid"},
            {"type": "output"},
        ],
        "expected_shape": (1, 1),
    },
    # ── RNN wrapper ───────────────────────────────────────────────────────────
    {
        "name": "RNN (seq=4, input=4->hidden=8->linear->3)",
        "pipeline": [
            {"type": "dataset", "data": [[[float(j) for j in range(4)] for _ in range(4)]]},
            {"type": "rnn",        "input_size": 4, "hidden_size": 8},
            {"type": "linear",     "in_features": 8, "out_features": 3},
            {"type": "activation", "name": "softmax", "dim": 1},
            {"type": "output"},
        ],
        "expected_shape": (1, 3),
    },
    # ── Self-attention ────────────────────────────────────────────────────────
    {
        "name": "Self-attention (seq=6, embed=32, heads=4) + linear",
        "pipeline": [
            {"type": "dataset", "data": [[[float(j % 5) for j in range(32)] for _ in range(6)]]},
            {"type": "selfattention", "embed_dim": 32, "num_heads": 4},
            {"type": "flatten",       "start_dim": 1},
            {"type": "linear",        "in_features": 192, "out_features": 5},
            {"type": "activation",    "name": "softmax", "dim": 1},
            {"type": "output"},
        ],
        "expected_shape": (1, 5),
    },
    # ── Transformer encoder layer ─────────────────────────────────────────────
    {
        "name": "TransformerEncoderLayer (seq=4, d_model=16, nhead=2) + linear",
        "pipeline": [
            {"type": "dataset", "data": [[[float(j) for j in range(16)] for _ in range(4)]]},
            {"type": "transformerencoderlayer", "d_model": 16, "nhead": 2, "dim_feedforward": 64},
            {"type": "flatten",    "start_dim": 1},
            {"type": "linear",     "in_features": 64, "out_features": 3},
            {"type": "activation", "name": "softmax", "dim": 1},
            {"type": "output"},
        ],
        "expected_shape": (1, 3),
    },
    # ── Conv1d ────────────────────────────────────────────────────────────────
    {
        "name": "Conv1d sequence model (in=1, out=8, k=3) + adaptive pool + linear",
        "pipeline": [
            {"type": "dataset", "data": [[[float(i) for i in range(20)]]]},
            {"type": "conv1d",         "in_channels": 1, "out_channels": 8, "kernel_size": 3},
            {"type": "activation",     "name": "relu"},
            {"type": "adaptiveavgpool1d", "output_size": 1},
            {"type": "flatten",        "start_dim": 1},
            {"type": "linear",         "in_features": 8, "out_features": 4},
            {"type": "activation",     "name": "softmax", "dim": 1},
            {"type": "output"},
        ],
        "expected_shape": (1, 4),
    },
    # ── Embedding + PositionalEncoding + transformer ──────────────────────────
    {
        "name": "Embedding + PositionalEncoding + TransformerEncoderLayer",
        "pipeline": [
            {"type": "dataset", "data": [[1, 4, 2, 7, 3]]},
            {"type": "embedding",              "num_embeddings": 100, "embedding_dim": 16},
            {"type": "positionalencoding",     "d_model": 16, "max_len": 32},
            {"type": "transformerencoderlayer","d_model": 16, "nhead": 2, "dim_feedforward": 32},
            {"type": "flatten",    "start_dim": 1},
            {"type": "linear",     "in_features": 80, "out_features": 2},
            {"type": "activation", "name": "softmax", "dim": 1},
            {"type": "output"},
        ],
        "expected_shape": (1, 2),
    },
    # ── GlobalAvgPool2d ───────────────────────────────────────────────────────
    {
        "name": "Conv2d + GlobalAvgPool2d + linear (mini CNN head)",
        "pipeline": [
            {"type": "dataset", "data": [[[[float(i % 5) for i in range(8)] for _ in range(8)]]]},
            {"type": "conv2d",        "in_channels": 1, "out_channels": 4, "kernel_size": 3, "padding": 1},
            {"type": "activation",    "name": "relu"},
            {"type": "globalavgpool2d"},
            {"type": "linear",        "in_features": 4, "out_features": 3},
            {"type": "activation",    "name": "softmax", "dim": 1},
            {"type": "output"},
        ],
        "expected_shape": (1, 3),
    },
]

# ══════════════════════════════════════════════════════════════════════════════
# Graph JSON format test cases (MNIST_Input.json style)
# ══════════════════════════════════════════════════════════════════════════════

MNIST_GRAPH: dict = {
    "dataset": "mnist",
    "layers": [
        {"id": "flatten-1", "type": "flatten", "end_dim": -1, "start_dim": 1},
        {"id": "linear-1",  "type": "linear",  "bias": True, "in_features": 784, "out_features": 128},
        {"id": "relu-1",    "type": "relu"},
        {"id": "linear-2",  "type": "linear",  "bias": True, "in_features": 128, "out_features": 10},
        {"id": "output-1",  "type": "output",  "name": "predictions"},
    ],
    "connections": [
        {"from": "flatten-1", "to": "linear-1"},
        {"from": "linear-1",  "to": "relu-1"},
        {"from": "relu-1",    "to": "linear-2"},
        {"from": "linear-2",  "to": "output-1"},
    ],
    "training_config": {
        "loss": "CrossEntropy",
        "optimizer": "Adam",
        "learning_rate": 0.001,
        "epochs": 10,
    },
}


def test_code_generation(case: dict) -> bool:
    try:
        code = pipeline_to_code(case["pipeline"])
        assert "nn.Sequential(" in code
        assert "import torch" in code
        assert "model.eval()" in code
        assert "nn.Dataset(" not in code
        assert "nn.Output("  not in code
        ok("code generation")
        return True
    except Exception as e:
        fail(f"code generation -> {e}")
        return False


def test_execution(case: dict) -> bool:
    try:
        result = run_pipeline(case["pipeline"])
        tensor = torch.tensor(result)
        assert tuple(tensor.shape) == case["expected_shape"], (
            f"shape mismatch: got {tuple(tensor.shape)}, expected {case['expected_shape']}"
        )
        ok(f"execution  shape={tuple(tensor.shape)}")
        return True
    except Exception as e:
        fail(f"execution -> {e}")
        traceback.print_exc()
        return False


def test_generated_code_runs(case: dict) -> bool:
    try:
        code = pipeline_to_code(case["pipeline"])
        exec(compile(code, "<generated>", "exec"), {})  # noqa: S102
        ok("exec generated code")
        return True
    except Exception as e:
        fail(f"exec generated code -> {e}")
        traceback.print_exc()
        return False


# ── Graph JSON format tests ──────────────────────────────────────────────────

def test_parse_node_strips_id() -> bool:
    """_parse_node must strip 'id' from params."""
    try:
        node = {"id": "linear-123", "type": "linear", "in_features": 64, "out_features": 128, "bias": True}
        node_type, params = _parse_node(node)
        assert node_type == "linear"
        assert "id" not in params, f"'id' should be stripped, got params={params}"
        assert params == {"in_features": 64, "out_features": 128, "bias": True}
        ok("_parse_node strips 'id'")
        return True
    except Exception as e:
        fail(f"_parse_node strips 'id' -> {e}")
        return False


def test_parse_node_strips_name_for_output() -> bool:
    """_parse_node must strip 'name' for output nodes."""
    try:
        node = {"id": "output-1", "type": "output", "name": "predictions"}
        node_type, params = _parse_node(node)
        assert node_type == "output"
        assert "name" not in params, f"'name' should be stripped for output, got params={params}"
        assert "id" not in params
        ok("_parse_node strips 'name' for output")
        return True
    except Exception as e:
        fail(f"_parse_node strips 'name' for output -> {e}")
        return False


def test_parse_node_keeps_name_for_activation() -> bool:
    """_parse_node must keep 'name' for activation nodes (backward compat)."""
    try:
        node = {"type": "activation", "name": "relu"}
        node_type, params = _parse_node(node)
        assert node_type == "activation"
        assert params.get("name") == "relu", f"'name' should be kept for activation, got params={params}"
        ok("_parse_node keeps 'name' for activation")
        return True
    except Exception as e:
        fail(f"_parse_node keeps 'name' for activation -> {e}")
        return False


def test_resolve_connections() -> bool:
    """resolve_connections should order layers by connection chain."""
    try:
        layers = [
            {"id": "c", "type": "relu"},
            {"id": "a", "type": "flatten", "start_dim": 1},
            {"id": "b", "type": "linear", "in_features": 10, "out_features": 5},
        ]
        connections = [
            {"from": "a", "to": "b"},
            {"from": "b", "to": "c"},
        ]
        ordered = resolve_connections(layers, connections)
        assert [l["id"] for l in ordered] == ["a", "b", "c"], (
            f"Expected ['a', 'b', 'c'], got {[l['id'] for l in ordered]}"
        )
        ok("resolve_connections ordering")
        return True
    except Exception as e:
        fail(f"resolve_connections -> {e}")
        return False


def test_convert_graph_json() -> bool:
    """convert_graph_json should produce a flat pipeline from graph JSON."""
    try:
        pipeline = convert_graph_json(MNIST_GRAPH)
        assert isinstance(pipeline, list)
        assert len(pipeline) == 5  # flatten, linear, relu, linear, output
        assert pipeline[0]["type"] == "flatten"
        assert pipeline[2]["type"] == "relu"
        assert pipeline[4]["type"] == "output"
        ok("convert_graph_json")
        return True
    except Exception as e:
        fail(f"convert_graph_json -> {e}")
        traceback.print_exc()
        return False


def test_build_model_from_graph() -> bool:
    """build_model should work with graph-format layers (with id fields)."""
    try:
        pipeline = convert_graph_json(MNIST_GRAPH)
        model = build_model(pipeline)
        # Smoke test: forward pass with dummy MNIST-shaped input (1, 1, 28, 28)
        x = torch.randn(1, 1, 28, 28)
        model.eval()
        with torch.no_grad():
            out = model(x)
        assert out.shape == (1, 10), f"Expected (1, 10), got {out.shape}"
        ok(f"build_model from graph  shape={tuple(out.shape)}")
        return True
    except Exception as e:
        fail(f"build_model from graph -> {e}")
        traceback.print_exc()
        return False


def test_direct_activation_types() -> bool:
    """Layers like {"type": "relu"} should work directly without activation wrapper."""
    try:
        pipeline = [
            {"type": "linear", "in_features": 8, "out_features": 16},
            {"type": "relu"},
            {"type": "linear", "in_features": 16, "out_features": 4},
            {"type": "sigmoid"},
        ]
        model = build_model(pipeline)
        x = torch.randn(1, 8)
        model.eval()
        with torch.no_grad():
            out = model(x)
        assert out.shape == (1, 4), f"Expected (1, 4), got {out.shape}"
        ok(f"direct activation types  shape={tuple(out.shape)}")
        return True
    except Exception as e:
        fail(f"direct activation types -> {e}")
        traceback.print_exc()
        return False


def test_graph_json_to_code() -> bool:
    """graph_json_to_code should generate valid training script code."""
    try:
        code = graph_json_to_code(MNIST_GRAPH)
        assert "nn.Sequential(" in code
        assert "import torch" in code
        assert "nn.Flatten(" in code
        assert "nn.ReLU()" in code
        assert "nn.CrossEntropyLoss()" in code
        assert "torch.optim.Adam(" in code
        assert "train_loader" in code
        assert "test_loader" in code
        assert "MNIST" in code
        ok("graph_json_to_code")
        return True
    except Exception as e:
        fail(f"graph_json_to_code -> {e}")
        traceback.print_exc()
        return False


def test_load_mnist_json_file() -> bool:
    """Load the actual MNIST_Input.json file, convert, and build model."""
    try:
        json_path = os.path.join(os.path.dirname(__file__), "..", "example", "MNIST_Input.json")
        with open(json_path, "r") as f:
            graph = json.load(f)
        pipeline = convert_graph_json(graph)
        model = build_model(pipeline)

        # Verify the pipeline was correctly ordered
        types = [n["type"] for n in pipeline]
        assert "flatten" in types, "Missing flatten layer"
        assert "linear" in types, "Missing linear layer"
        assert "output" in types, "Missing output layer"

        # Verify training_config was preserved in the graph
        assert graph["training_config"]["loss"] == "CrossEntropy"
        assert graph["training_config"]["optimizer"] == "Adam"

        # Verify model was built (nn.Sequential with correct number of layers)
        num_model_layers = len(list(model.children()))
        assert num_model_layers > 0, "Model has no layers"

        ok(f"load MNIST_Input.json  pipeline_len={len(pipeline)} model_layers={num_model_layers}")
        return True
    except Exception as e:
        fail(f"load MNIST_Input.json -> {e}")
        traceback.print_exc()
        return False


def main() -> None:
    total = passed = 0

    # ── Original pipeline tests ──────────────────────────────────────────────
    for case in CASES:
        header(case["name"])
        for fn in (test_code_generation, test_execution, test_generated_code_runs):
            total  += 1
            passed += fn(case)

    # ── Graph JSON format tests ──────────────────────────────────────────────
    header("Graph JSON Format — _parse_node")
    for fn in (test_parse_node_strips_id, test_parse_node_strips_name_for_output,
               test_parse_node_keeps_name_for_activation):
        total  += 1
        passed += fn()

    header("Graph JSON Format — resolve_connections")
    total  += 1
    passed += test_resolve_connections()

    header("Graph JSON Format — convert & build")
    for fn in (test_convert_graph_json, test_build_model_from_graph,
               test_direct_activation_types):
        total  += 1
        passed += fn()

    header("Graph JSON Format — code generation")
    total  += 1
    passed += test_graph_json_to_code()

    header("Graph JSON Format — MNIST_Input.json file")
    total  += 1
    passed += test_load_mnist_json_file()

    # ── Preview ──────────────────────────────────────────────────────────────
    transformer_case = next(c for c in CASES if "Embedding" in c["name"])
    header("Generated code preview (Embedding + PE + Transformer)")
    print(f"{YELLOW}{pipeline_to_code(transformer_case['pipeline'])}{RESET}")

    header("Generated code preview (MNIST Graph JSON)")
    print(f"{YELLOW}{graph_json_to_code(MNIST_GRAPH)}{RESET}")

    colour = GREEN if passed == total else RED
    print(f"\n{colour}{'='*64}")
    print(f"  Results: {passed}/{total} tests passed")
    print(f"{'='*64}{RESET}\n")

    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
