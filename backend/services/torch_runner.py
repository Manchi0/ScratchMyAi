from __future__ import annotations

import io
import json
from typing import Any

import torch
import torch.nn as nn
import numpy as np


LAYER_REGISTRY: dict[str, type[nn.Module]] = {
    "linear": nn.Linear,
    "relu": nn.ReLU,
    "sigmoid": nn.Sigmoid,
    "tanh": nn.Tanh,
    "dropout": nn.Dropout,
    "conv2d": nn.Conv2d,
    "maxpool2d": nn.MaxPool2d,
    "batchnorm1d": nn.BatchNorm1d,
    "lstm": nn.LSTM,
}


def build_model(layer_configs: list[dict[str, Any]]) -> nn.Sequential:
    """Build a Sequential model from a list of layer config dicts."""
    layers: list[nn.Module] = []
    for cfg in layer_configs:
        layer_type = cfg.get("type", "").lower()
        if layer_type not in LAYER_REGISTRY:
            raise ValueError(f"Unknown layer type: {layer_type!r}")
        params = {k: v for k, v in cfg.items() if k != "type"}
        layers.append(LAYER_REGISTRY[layer_type](**params))
    return nn.Sequential(*layers)


def run_inference(
    layer_configs: list[dict[str, Any]],
    input_data: list[list[float]],
) -> list[list[float]]:
    """Build model, run forward pass, return output as nested list."""
    model = build_model(layer_configs)
    model.eval()
    x = torch.tensor(input_data, dtype=torch.float32)
    with torch.no_grad():
        out = model(x)
    return out.tolist()


def serialize_model(model: nn.Module) -> bytes:
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    return buf.getvalue()


def deserialize_model(layer_configs: list[dict[str, Any]], state_bytes: bytes) -> nn.Module:
    model = build_model(layer_configs)
    buf = io.BytesIO(state_bytes)
    model.load_state_dict(torch.load(buf, weights_only=True))
    return model
