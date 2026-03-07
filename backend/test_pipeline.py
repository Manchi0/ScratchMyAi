"""
Run from the backend/ directory:
    python test_pipeline.py
"""
from __future__ import annotations

import sys
import io
import traceback

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import torch
from services.code_generator import pipeline_to_code
from services.torch_runner import run_pipeline

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


def main() -> None:
    total = passed = 0

    for case in CASES:
        header(case["name"])
        for fn in (test_code_generation, test_execution, test_generated_code_runs):
            total  += 1
            passed += fn(case)

    # Preview generated transformer code
    transformer_case = next(c for c in CASES if "Embedding" in c["name"])
    header("Generated code preview (Embedding + PE + Transformer)")
    print(f"{YELLOW}{pipeline_to_code(transformer_case['pipeline'])}{RESET}")

    colour = GREEN if passed == total else RED
    print(f"\n{colour}{'='*64}")
    print(f"  Results: {passed}/{total} tests passed")
    print(f"{'='*64}{RESET}\n")

    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
