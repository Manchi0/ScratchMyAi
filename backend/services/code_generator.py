from __future__ import annotations

from typing import Any

from services.torch_runner import CONTROL_NODES, _parse_node

# Maps activation "name" value -> nn.ClassName
ACTIVATION_CLASS_NAMES: dict[str, str] = {
    "relu":        "ReLU",
    "gelu":        "GELU",
    "silu":        "SiLU",
    "leakyrelu":   "LeakyReLU",
    "elu":         "ELU",
    "selu":        "SELU",
    "mish":        "Mish",
    "prelu":       "PReLU",
    "hardswish":   "Hardswish",
    "hardsigmoid": "Hardsigmoid",
    "sigmoid":     "Sigmoid",
    "tanh":        "Tanh",
    "softmax":     "Softmax",
    "logsoftmax":  "LogSoftmax",
    "softplus":    "Softplus",
}

# Maps lowercase node type -> nn.ClassName for standard PyTorch modules
CLASS_NAMES: dict[str, str] = {
    # Linear
    "linear":        "Linear",
    "bilinear":      "Bilinear",
    "identity":      "Identity",
    # Normalization
    "layernorm":      "LayerNorm",
    "batchnorm1d":    "BatchNorm1d",
    "batchnorm2d":    "BatchNorm2d",
    "groupnorm":      "GroupNorm",
    "instancenorm1d": "InstanceNorm1d",
    "instancenorm2d": "InstanceNorm2d",
    # Dropout
    "dropout":       "Dropout",
    "dropout2d":     "Dropout2d",
    "alphadropout":  "AlphaDropout",
    # Embeddings
    "embedding":     "Embedding",
    "embeddingbag":  "EmbeddingBag",
    # Convolutions
    "conv1d":          "Conv1d",
    "conv2d":          "Conv2d",
    "conv3d":          "Conv3d",
    "convtranspose1d": "ConvTranspose1d",
    "convtranspose2d": "ConvTranspose2d",
    # Pooling
    "maxpool1d":         "MaxPool1d",
    "maxpool2d":         "MaxPool2d",
    "maxpool3d":         "MaxPool3d",
    "avgpool1d":         "AvgPool1d",
    "avgpool2d":         "AvgPool2d",
    "adaptiveavgpool1d": "AdaptiveAvgPool1d",
    "adaptiveavgpool2d": "AdaptiveAvgPool2d",
    "adaptivemaxpool1d": "AdaptiveMaxPool1d",
    "adaptivemaxpool2d": "AdaptiveMaxPool2d",
    # Shape
    "flatten":      "Flatten",
    "unflatten":    "Unflatten",
    "upsample":     "Upsample",
    "pixelshuffle": "PixelShuffle",
}

# Wrapper types — not nn.*, need their class definition in the generated code
WRAPPER_TYPES: set[str] = {
    "lstm", "gru", "rnn",
    "selfattention",
    "transformerencoderlayer",
    "positionalencoding",
    "globalavgpool2d",
}

# Source code for each wrapper class, embedded into generated output when used
WRAPPER_DEFINITIONS: dict[str, str] = {
    "lstm": """\
class LSTMWrapper(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers=1,
                 batch_first=True, bidirectional=False, return_sequence=False):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers=num_layers,
                            batch_first=batch_first, bidirectional=bidirectional)
        self.return_sequence = return_sequence

    def forward(self, x):
        out, _ = self.lstm(x)
        return out if self.return_sequence else out[:, -1, :]
""",
    "gru": """\
class GRUWrapper(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers=1,
                 batch_first=True, bidirectional=False, return_sequence=False):
        super().__init__()
        self.gru = nn.GRU(input_size, hidden_size, num_layers=num_layers,
                          batch_first=batch_first, bidirectional=bidirectional)
        self.return_sequence = return_sequence

    def forward(self, x):
        out, _ = self.gru(x)
        return out if self.return_sequence else out[:, -1, :]
""",
    "rnn": """\
class RNNWrapper(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers=1,
                 batch_first=True, nonlinearity="tanh", return_sequence=False):
        super().__init__()
        self.rnn = nn.RNN(input_size, hidden_size, num_layers=num_layers,
                          batch_first=batch_first, nonlinearity=nonlinearity)
        self.return_sequence = return_sequence

    def forward(self, x):
        out, _ = self.rnn(x)
        return out if self.return_sequence else out[:, -1, :]
""",
    "selfattention": """\
class SelfAttentionWrapper(nn.Module):
    def __init__(self, embed_dim, num_heads, dropout=0.0, batch_first=True):
        super().__init__()
        self.attn = nn.MultiheadAttention(embed_dim, num_heads,
                                          dropout=dropout, batch_first=batch_first)

    def forward(self, x):
        out, _ = self.attn(x, x, x)
        return out
""",
    "transformerencoderlayer": """\
class TransformerEncoderLayerWrapper(nn.Module):
    def __init__(self, d_model, nhead, dim_feedforward=2048, dropout=0.1,
                 activation="relu", batch_first=True, norm_first=False):
        super().__init__()
        self.layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead, dim_feedforward=dim_feedforward,
            dropout=dropout, activation=activation,
            batch_first=batch_first, norm_first=norm_first,
        )

    def forward(self, x):
        return self.layer(x)
""",
    "positionalencoding": """\
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=512, dropout=0.0):
        super().__init__()
        import math
        self.dropout = nn.Dropout(p=dropout)
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1).float()
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x):
        x = x + self.pe[:, :x.size(1)]
        return self.dropout(x)
""",
    "globalavgpool2d": """\
class GlobalAvgPool2d(nn.Module):
    def forward(self, x):
        import torch.nn.functional as F
        return F.adaptive_avg_pool2d(x, 1).flatten(1)
""",
}

# Maps wrapper type -> class name used in instantiation
WRAPPER_CLASS_NAMES: dict[str, str] = {
    "lstm":                    "LSTMWrapper",
    "gru":                     "GRUWrapper",
    "rnn":                     "RNNWrapper",
    "selfattention":           "SelfAttentionWrapper",
    "transformerencoderlayer": "TransformerEncoderLayerWrapper",
    "positionalencoding":      "PositionalEncoding",
    "globalavgpool2d":         "GlobalAvgPool2d",
}


def _format_value(v: Any) -> str:
    if isinstance(v, str):
        return repr(v)
    if isinstance(v, bool):
        return str(v)
    return str(v)


def _format_layer(node_type: str, params: dict[str, Any]) -> str:
    if node_type in WRAPPER_TYPES:
        class_name = WRAPPER_CLASS_NAMES[node_type]
    else:
        class_name = f"nn.{CLASS_NAMES[node_type]}"

    if not params:
        return f"{class_name}()"
    args = ", ".join(f"{k}={_format_value(v)}" for k, v in params.items())
    return f"{class_name}({args})"


def pipeline_to_code(pipeline: list[dict[str, Any]]) -> str:
    """
    Convert a pipeline JSON list into a standalone, runnable Python/PyTorch
    code string. Wrapper class definitions are auto-included when used.
    """
    layer_lines: list[str] = []
    used_wrappers: list[str] = []  # ordered, deduped
    input_data = None
    input_dtype = "torch.float32"

    for node in pipeline:
        node_type, params = _parse_node(node)

        if node_type == "dataset":
            input_data = params.get("data")
            continue
        if node_type == "output":
            continue

        if node_type == "activation":
            name = params.get("name", "").lower()
            if name not in ACTIVATION_CLASS_NAMES:
                raise ValueError(
                    f"Unknown activation: {name!r}. "
                    f"Available: {sorted(ACTIVATION_CLASS_NAMES)}"
                )
            extra = {k: v for k, v in params.items() if k != "name"}
            class_name = f"nn.{ACTIVATION_CLASS_NAMES[name]}"
            if extra:
                args = ", ".join(f"{k}={_format_value(v)}" for k, v in extra.items())
                layer_lines.append(f"{class_name}({args})")
            else:
                layer_lines.append(f"{class_name}()")
            continue

        if node_type not in CLASS_NAMES and node_type not in WRAPPER_TYPES:
            raise ValueError(
                f"Unknown node type: {node_type!r}. "
                f"Available: {sorted({**{k: k for k in CLASS_NAMES}, **{k: k for k in WRAPPER_TYPES}})}"
            )

        if node_type in ("embedding", "embeddingbag"):
            input_dtype = "torch.long"

        if node_type in WRAPPER_TYPES and node_type not in used_wrappers:
            used_wrappers.append(node_type)

        layer_lines.append(_format_layer(node_type, params))

    if not layer_lines:
        raise ValueError("Pipeline contains no model layers.")

    indent = "    "
    layers_block = f",\n{indent}".join(layer_lines)
    data_repr = repr(input_data) if input_data is not None else "[[...]]  # your data here"

    wrapper_code = ""
    if used_wrappers:
        defs = "\n".join(WRAPPER_DEFINITIONS[w] for w in used_wrappers)
        wrapper_code = f"\n{defs}\n"

    return f"""\
import math
import torch
import torch.nn as nn
{wrapper_code}
model = nn.Sequential(
    {layers_block},
)

input_data = {data_repr}
x = torch.tensor(input_data, dtype={input_dtype})

model.eval()
with torch.no_grad():
    output = model(x)

print(output)
"""
