from __future__ import annotations

import io
import math
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F

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


# ---------------------------------------------------------------------------
# Pipeline parsing
# ---------------------------------------------------------------------------

def _parse_node(node: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Return (type, params) from a node dict."""
    node_type = node.get("type", "").lower().strip()
    params = {k: v for k, v in node.items() if k != "type"}
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
