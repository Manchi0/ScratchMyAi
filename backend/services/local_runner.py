from __future__ import annotations

import io
import json
import math
from pathlib import Path
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader

# Nodes that are not PyTorch layers — handled by the pipeline runner
CONTROL_NODES = {"dataset", "output"}


# ---------------------------------------------------------------------------
# Wrapper classes
# Needed when nn.* modules either return tuples (LSTM/GRU) or take multiple
# inputs (MultiheadAttention), which breaks nn.Sequential.
# ---------------------------------------------------------------------------

class LSTMWrapper(nn.Module):
    """LSTM that returns only the output tensor, not the hidden-state tuple."""
    def __init__(self, input_size: int, hidden_size: int, num_layers: int = 1,
                 batch_first: bool = True, bidirectional: bool = False,
                 return_sequence: bool = False):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers=num_layers,
                            batch_first=batch_first, bidirectional=bidirectional)
        self.return_sequence = return_sequence

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        return out if self.return_sequence else out[:, -1, :]


class GRUWrapper(nn.Module):
    """GRU that returns only the output tensor, not the hidden-state tuple."""
    def __init__(self, input_size: int, hidden_size: int, num_layers: int = 1,
                 batch_first: bool = True, bidirectional: bool = False,
                 return_sequence: bool = False):
        super().__init__()
        self.gru = nn.GRU(input_size, hidden_size, num_layers=num_layers,
                          batch_first=batch_first, bidirectional=bidirectional)
        self.return_sequence = return_sequence

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.gru(x)
        return out if self.return_sequence else out[:, -1, :]


class RNNWrapper(nn.Module):
    """Vanilla RNN that returns only the output tensor."""
    def __init__(self, input_size: int, hidden_size: int, num_layers: int = 1,
                 batch_first: bool = True, nonlinearity: str = "tanh",
                 return_sequence: bool = False):
        super().__init__()
        self.rnn = nn.RNN(input_size, hidden_size, num_layers=num_layers,
                          batch_first=batch_first, nonlinearity=nonlinearity)
        self.return_sequence = return_sequence

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.rnn(x)
        return out if self.return_sequence else out[:, -1, :]


class SelfAttentionWrapper(nn.Module):
    """Multi-head self-attention (query=key=value=x). Returns attended output only."""
    def __init__(self, embed_dim: int, num_heads: int, dropout: float = 0.0,
                 batch_first: bool = True):
        super().__init__()
        self.attn = nn.MultiheadAttention(embed_dim, num_heads, dropout=dropout,
                                          batch_first=batch_first)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.attn(x, x, x)
        return out


class TransformerEncoderLayerWrapper(nn.Module):
    """Single transformer encoder block (self-attn + FFN + norms). Sequential-safe."""
    def __init__(self, d_model: int, nhead: int, dim_feedforward: int = 2048,
                 dropout: float = 0.1, activation: str = "relu",
                 batch_first: bool = True, norm_first: bool = False):
        super().__init__()
        self.layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead, dim_feedforward=dim_feedforward,
            dropout=dropout, activation=activation,
            batch_first=batch_first, norm_first=norm_first,
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.layer(x)


class PositionalEncoding(nn.Module):
    """Sinusoidal positional encoding. Add after an Embedding layer."""
    def __init__(self, d_model: int, max_len: int = 512, dropout: float = 0.0):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1).float()
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))  # [1, max_len, d_model]

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.pe[:, : x.size(1)]
        return self.dropout(x)


class GlobalAvgPool2d(nn.Module):
    """Adaptive global average pooling over spatial dims, returns [N, C]."""
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return F.adaptive_avg_pool2d(x, 1).flatten(1)


# ---------------------------------------------------------------------------
# Activation registry — used by the {"type": "activation", "name": "..."} node
# ---------------------------------------------------------------------------

ACTIVATION_REGISTRY: dict[str, type[nn.Module]] = {
    "relu":        nn.ReLU,
    "gelu":        nn.GELU,          # BERT, GPT, most modern transformers
    "silu":        nn.SiLU,          # LLaMA, EfficientNet (aka Swish)
    "leakyrelu":   nn.LeakyReLU,
    "elu":         nn.ELU,
    "selu":        nn.SELU,
    "mish":        nn.Mish,          # YOLOv4+
    "prelu":       nn.PReLU,
    "hardswish":   nn.Hardswish,     # MobileNetV3
    "hardsigmoid": nn.Hardsigmoid,
    "sigmoid":     nn.Sigmoid,
    "tanh":        nn.Tanh,
    "softmax":     nn.Softmax,
    "logsoftmax":  nn.LogSoftmax,
    "softplus":    nn.Softplus,
}


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

LAYER_REGISTRY: dict[str, type[nn.Module]] = {
    # ── Linear ───────────────────────────────────────────────────────────────
    "linear":        nn.Linear,
    "bilinear":      nn.Bilinear,
    "identity":      nn.Identity,

    # ── Normalization ─────────────────────────────────────────────────────────
    "layernorm":      nn.LayerNorm,      # transformers
    "batchnorm1d":    nn.BatchNorm1d,
    "batchnorm2d":    nn.BatchNorm2d,
    "groupnorm":      nn.GroupNorm,      # small-batch CNNs
    "instancenorm1d": nn.InstanceNorm1d,
    "instancenorm2d": nn.InstanceNorm2d, # style transfer, GANs

    # ── Dropout ───────────────────────────────────────────────────────────────
    "dropout":       nn.Dropout,
    "dropout2d":     nn.Dropout2d,
    "alphadropout":  nn.AlphaDropout,   # pairs with SELU

    # ── Embeddings ────────────────────────────────────────────────────────────
    "embedding":          nn.Embedding,
    "embeddingbag":       nn.EmbeddingBag,

    # ── Recurrent (wrappers — return tensor, not tuple) ───────────────────────
    "lstm":          LSTMWrapper,
    "gru":           GRUWrapper,
    "rnn":           RNNWrapper,

    # ── Attention / Transformer ───────────────────────────────────────────────
    "selfattention":          SelfAttentionWrapper,
    "transformerencoderlayer": TransformerEncoderLayerWrapper,
    "positionalencoding":     PositionalEncoding,

    # ── Convolutions ─────────────────────────────────────────────────────────
    "conv1d":          nn.Conv1d,        # sequences, audio, time series
    "conv2d":          nn.Conv2d,
    "conv3d":          nn.Conv3d,        # video
    "convtranspose1d": nn.ConvTranspose1d,
    "convtranspose2d": nn.ConvTranspose2d, # decoder / UNet upsampling

    # ── Pooling ───────────────────────────────────────────────────────────────
    "maxpool1d":         nn.MaxPool1d,
    "maxpool2d":         nn.MaxPool2d,
    "maxpool3d":         nn.MaxPool3d,
    "avgpool1d":         nn.AvgPool1d,
    "avgpool2d":         nn.AvgPool2d,
    "adaptiveavgpool1d": nn.AdaptiveAvgPool1d,
    "adaptiveavgpool2d": nn.AdaptiveAvgPool2d, # global avg pool for ResNet heads
    "adaptivemaxpool1d": nn.AdaptiveMaxPool1d,
    "adaptivemaxpool2d": nn.AdaptiveMaxPool2d,
    "globalavgpool2d":   GlobalAvgPool2d,       # AdaptiveAvgPool2d(1,1) + flatten

    # ── Shape utilities ───────────────────────────────────────────────────────
    "flatten":     nn.Flatten,
    "unflatten":   nn.Unflatten,
    "upsample":    nn.Upsample,
    "pixelshuffle": nn.PixelShuffle,    # super-resolution
}

# Register all activation names as direct layer types so that
# {"type": "relu"} works in the new JSON format (not just {"type": "activation", "name": "relu"}).
for _act_name, _act_cls in ACTIVATION_REGISTRY.items():
    LAYER_REGISTRY.setdefault(_act_name, _act_cls)


# ---------------------------------------------------------------------------
# Pipeline parsing
# ---------------------------------------------------------------------------

# Fields to strip from node dicts — they are metadata, not constructor kwargs
_META_KEYS = {"type", "id", "name"}


def _parse_node(node: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Return (type, params) from a node dict.

    Strips metadata keys ('type', 'id') that are not constructor arguments.
    The 'name' key is stripped for output nodes but kept for activation nodes
    (backward compat with {"type": "activation", "name": "relu"} format).
    """
    node_type = node.get("type", "").lower().strip()
    # For output nodes, 'name' is metadata (e.g. "predictions").
    # For activation nodes, 'name' is a required param (e.g. "relu").
    skip = _META_KEYS if node_type != "activation" else {"type", "id"}
    params = {k: v for k, v in node.items() if k not in skip}
    return node_type, params


def _extract_dataset(pipeline: list[dict[str, Any]]) -> list | None:
    """Pull input data out of the first 'dataset' node, if present."""
    for node in pipeline:
        if node.get("type", "").lower() == "dataset":
            return node.get("data")
    return None


def build_model(pipeline: list[dict[str, Any]]) -> nn.Sequential:
    """Build an nn.Sequential from all non-control nodes in the pipeline."""
    layers: list[nn.Module] = []

    for node in pipeline:
        node_type, params = _parse_node(node)

        if node_type in CONTROL_NODES:
            continue

        if node_type == "activation":
            name = params.pop("name", "").lower()
            if name not in ACTIVATION_REGISTRY:
                raise ValueError(
                    f"Unknown activation: {name!r}. "
                    f"Available: {sorted(ACTIVATION_REGISTRY)}"
                )
            layers.append(ACTIVATION_REGISTRY[name](**params))
            continue

        if node_type not in LAYER_REGISTRY:
            raise ValueError(
                f"Unknown node type: {node_type!r}. "
                f"Available: {sorted(LAYER_REGISTRY)}"
            )

        layers.append(LAYER_REGISTRY[node_type](**params))

    if not layers:
        raise ValueError("Pipeline contains no model layers.")

    return nn.Sequential(*layers)


# ---------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------

def run_pipeline(pipeline: list[dict[str, Any]]) -> list:
    """
    Build model from pipeline, run forward pass on the embedded dataset node,
    and return output as a nested list.
    """
    input_data = _extract_dataset(pipeline)
    if input_data is None:
        raise ValueError("Pipeline must contain a 'dataset' node with a 'data' key.")

    # Use long dtype when first layer is an embedding
    first_layer = next(
        (n.get("type", "").lower() for n in pipeline if n.get("type", "").lower() not in CONTROL_NODES),
        None,
    )
    dtype = torch.long if first_layer in ("embedding", "embeddingbag") else torch.float32

    model = build_model(pipeline)
    model.eval()

    x = torch.tensor(input_data, dtype=dtype)
    with torch.no_grad():
        out = model(x)

    return out.tolist()


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------

def serialize_model(model: nn.Module) -> bytes:
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    return buf.getvalue()


def deserialize_model(pipeline: list[dict[str, Any]], state_bytes: bytes) -> nn.Module:
    model = build_model(pipeline)
    buf = io.BytesIO(state_bytes)
    model.load_state_dict(torch.load(buf, weights_only=True))
    return model


# ---------------------------------------------------------------------------
# Graph JSON conversion (MNIST_Input.json format)
# ---------------------------------------------------------------------------

def resolve_connections(
    layers: list[dict[str, Any]],
    connections: list[dict[str, str]],
) -> list[dict[str, Any]]:
    """Order *layers* according to *connections* (a list of {from, to} edges).

    Assumes a single linear chain. Returns layers in topological order.
    """
    if not connections:
        return layers  # already in order

    id_to_layer = {layer["id"]: layer for layer in layers if "id" in layer}

    # Build adjacency: from_id -> to_id
    successors: dict[str, str] = {}
    predecessors: set[str] = set()
    for conn in connections:
        successors[conn["from"]] = conn["to"]
        predecessors.add(conn["to"])

    # Find the head node (no incoming edge)
    all_ids = set(id_to_layer.keys())
    heads = all_ids - predecessors
    if not heads:
        raise ValueError("Circular dependency detected in connections.")

    # Walk the chain
    ordered: list[dict[str, Any]] = []
    current = heads.pop()
    visited: set[str] = set()
    while current:
        if current in visited:
            raise ValueError(f"Cycle detected at node {current!r}.")
        visited.add(current)
        if current in id_to_layer:
            ordered.append(id_to_layer[current])
        current = successors.get(current)

    return ordered


def convert_graph_json(graph: dict[str, Any]) -> list[dict[str, Any]]:
    """Convert the graph JSON format into a flat pipeline list.

    Input format (MNIST_Input.json)::

        {
          "dataset": "mnist",
          "layers": [...],
          "connections": [...],
          "training_config": {...}
        }

    Returns a flat list compatible with ``build_model`` / ``run_pipeline``.
    ``training_config`` is *not* included in the pipeline; retrieve it
    separately via ``graph["training_config"]``.
    """
    layers = graph.get("layers", [])
    connections = graph.get("connections", [])

    ordered = resolve_connections(layers, connections) if connections else layers
    return ordered


# ---------------------------------------------------------------------------
# Dataset loading
# ---------------------------------------------------------------------------

def load_dataset(
    name: str,
    batch_size: int = 64,
    data_dir: str = "./data",
) -> tuple[DataLoader, DataLoader]:
    """Load a well-known dataset by name. Returns (train_loader, test_loader)."""
    import torchvision
    import torchvision.transforms as T

    name_lower = name.lower().strip()

    if name_lower == "mnist":
        transform = T.Compose([T.ToTensor(), T.Normalize((0.1307,), (0.3081,))])
        train_ds = torchvision.datasets.MNIST(data_dir, train=True, download=True, transform=transform)
        test_ds = torchvision.datasets.MNIST(data_dir, train=False, download=True, transform=transform)
    elif name_lower in ("fashionmnist", "fashion_mnist", "fashion-mnist"):
        transform = T.Compose([T.ToTensor(), T.Normalize((0.2860,), (0.3530,))])
        train_ds = torchvision.datasets.FashionMNIST(data_dir, train=True, download=True, transform=transform)
        test_ds = torchvision.datasets.FashionMNIST(data_dir, train=False, download=True, transform=transform)
    elif name_lower in ("cifar10", "cifar-10"):
        transform = T.Compose([T.ToTensor(), T.Normalize((0.4914, 0.4822, 0.4465), (0.2470, 0.2435, 0.2616))])
        train_ds = torchvision.datasets.CIFAR10(data_dir, train=True, download=True, transform=transform)
        test_ds = torchvision.datasets.CIFAR10(data_dir, train=False, download=True, transform=transform)
    else:
        raise ValueError(
            f"Unknown dataset: {name!r}. "
            f"Available: ['mnist', 'fashionmnist', 'cifar10']"
        )

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)
    return train_loader, test_loader


# ---------------------------------------------------------------------------
# Training support
# ---------------------------------------------------------------------------

LOSS_REGISTRY: dict[str, type[nn.Module]] = {
    "crossentropy":        nn.CrossEntropyLoss,
    "crossentropyloss":    nn.CrossEntropyLoss,
    "mse":                 nn.MSELoss,
    "mseloss":             nn.MSELoss,
    "l1":                  nn.L1Loss,
    "l1loss":              nn.L1Loss,
    "nll":                 nn.NLLLoss,
    "nllloss":             nn.NLLLoss,
    "bce":                 nn.BCELoss,
    "bceloss":             nn.BCELoss,
    "bcewithlogits":       nn.BCEWithLogitsLoss,
    "bcewithlogitsloss":   nn.BCEWithLogitsLoss,
    "huber":               nn.HuberLoss,
    "huberloss":           nn.HuberLoss,
    "smoothl1":            nn.SmoothL1Loss,
    "smoothl1loss":        nn.SmoothL1Loss,
}

OPTIMIZER_REGISTRY: dict[str, type[torch.optim.Optimizer]] = {
    "adam":     torch.optim.Adam,
    "adamw":    torch.optim.AdamW,
    "sgd":      torch.optim.SGD,
    "rmsprop":  torch.optim.RMSprop,
    "adagrad":  torch.optim.Adagrad,
    "adadelta": torch.optim.Adadelta,
}


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    training_config: dict[str, Any],
    device: str = "cpu",
) -> dict[str, Any]:
    """Train *model* on *train_loader* according to *training_config*.

    Returns a dict with ``{epoch_losses, final_loss}``.
    """
    loss_name = training_config.get("loss", "crossentropy").lower().replace(" ", "")
    opt_name = training_config.get("optimizer", "adam").lower()
    lr = float(training_config.get("learning_rate", 0.001))
    epochs = int(training_config.get("epochs", 10))

    if loss_name not in LOSS_REGISTRY:
        raise ValueError(f"Unknown loss: {loss_name!r}. Available: {sorted(LOSS_REGISTRY)}")
    if opt_name not in OPTIMIZER_REGISTRY:
        raise ValueError(f"Unknown optimizer: {opt_name!r}. Available: {sorted(OPTIMIZER_REGISTRY)}")

    criterion = LOSS_REGISTRY[loss_name]()
    optimizer = OPTIMIZER_REGISTRY[opt_name](model.parameters(), lr=lr)

    model.to(device)
    model.train()

    epoch_losses: list[float] = []

    for epoch in range(1, epochs + 1):
        running_loss = 0.0
        batches = 0
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
            batches += 1

        avg_loss = running_loss / max(batches, 1)
        epoch_losses.append(avg_loss)

    return {"epoch_losses": epoch_losses, "final_loss": epoch_losses[-1] if epoch_losses else None}


def run_graph_json(graph: dict[str, Any], device: str = "cpu") -> dict[str, Any]:
    """High-level entry point: build, train, and evaluate from graph JSON.

    Returns ``{model, train_result}``.
    """
    pipeline = convert_graph_json(graph)
    model = build_model(pipeline)

    dataset_name = graph.get("dataset")
    training_config = graph.get("training_config", {})

    if dataset_name:
        train_loader, test_loader = load_dataset(dataset_name)
        result = train_model(model, train_loader, training_config, device=device)
        return {"model": model, "train_result": result}
    else:
        return {"model": model, "train_result": None}
