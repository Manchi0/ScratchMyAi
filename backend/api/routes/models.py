from fastapi import APIRouter, HTTPException, Depends
print("DEBUG: models.py is being loaded", flush=True)

from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Any, List, Literal
import uuid

from db.supabase import get_supabase
from services.code_generator import graph_json_to_code
from services.inference_service import inference_service
from services.openai_service import run_messages as run_openai_messages
from api.routes.helperFunctions import (
    TrainRequest,
    get_current_user_id,
    training_stream_generator,
    _extract_output_model_name,
    _next_available_model_name,
)

router = APIRouter(prefix="/models", tags=["models"])

@router.post("/train")
async def train_model(request: TrainRequest, user_id: str = Depends(get_current_user_id)):
    """Starts a dynamic training job on Modal and streams output back via SSE."""
    return StreamingResponse(
        training_stream_generator(request, user_id), 
        media_type="text/event-stream"
    )

class SaveModelRequest(BaseModel):
    name: str
    graph_json: dict[str, Any]
    dataset: str
    accuracy: float | None = None
    loss: float | None = None
    epochs: int | None = None
    training_time_seconds: float | None = None

class PredictRequest(BaseModel):
    input_data: List[Any]


class ExportPythonRequest(BaseModel):
    graph_json: dict[str, Any]
    dataset: str | None = None


_TUTOR_SYSTEM_PROMPT = """You are Axon, an AI tutor embedded inside AxonX — a visual neural network builder where students design deep learning architectures by connecting blocks on a canvas.

Your teaching philosophy:
- Be Socratic when a student seems confused or asks something vague. Ask one focused guiding question that helps them reason through the problem themselves, rather than immediately handing them the answer.
- Always explain the *why*, not just the *what*. If you suggest adding a ReLU after a Linear layer, explain what non-linearity does and why it matters for that student's specific architecture.
- Reference the student's actual graph and training results directly — never give generic ML advice when you have their specific architecture and metrics in front of you. Mention exact numbers, specific layer names, and actual parameter values.
- Point out architectural mistakes in the graph when they are relevant to the question being asked. If you notice a problem (e.g. Conv2d → Linear without a Flatten), flag it clearly.
- Be honest about uncertainty. If you're not sure why their model is behaving a certain way, say "I'm not certain, but..." — never guess confidently.
- Keep responses concise and beginner-friendly. When you use jargon (like "vanishing gradients", "feature maps", or "overfitting"), explain it briefly in plain language immediately after.
- Do not lecture at length when a short answer will do. Match your verbosity to the complexity of the question.

What you have access to:
- The student's full graph: every block they've placed (with its type and all parameters like in_features, out_channels, hidden_size), and every connection between blocks.
- Their latest training results: final accuracy, final loss, number of epochs completed, and total training time. If no training has been done, this is stated explicitly — in that case, do not reference or invent metrics.
- Their training configuration: optimizer choice, loss function, learning rate, and number of epochs set.

Always use this context. A student who asks "why is my accuracy low?" needs you to look at their actual accuracy number, their specific architecture (are layers correctly sized? is there a proper output?), and their training config (is the learning rate reasonable? enough epochs?) — not a generic bullet list of possible causes."""


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class TrainingResult(BaseModel):
    accuracy: float | None = None
    loss: float | None = None
    epochs: int | None = None
    training_time_seconds: float | None = None


class AssistantChatRequest(BaseModel):
    message: str
    history: list[AssistantMessage] = Field(default_factory=list)
    graph: dict[str, Any] = Field(default_factory=dict)
    model: str | None = None
    system: str | None = None
    training_results: TrainingResult | None = None


class AssistantChatResponse(BaseModel):
    provider: str = "openai"
    model: str
    reply: str


def _build_graph_summary(graph: dict[str, Any], training_results: TrainingResult | None = None) -> str:
    if not graph:
        return "No graph context was provided."

    title = graph.get("title") or "Untitled"
    dataset = graph.get("dataset") or "unspecified"
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []
    training_config = graph.get("training_config") or {}

    lines = [
        f"Graph title: {title}",
        f"Dataset: {dataset}",
        f"Training config: optimizer={training_config.get('optimizer', '?')}, "
        f"loss={training_config.get('loss', '?')}, "
        f"lr={training_config.get('learning_rate', '?')}, "
        f"epochs={training_config.get('epochs', '?')}",
        "",
        f"Architecture ({len(nodes)} blocks, {len(edges)} connections):",
    ]

    for node in nodes:
        data = node.get("data") or {}
        block_type = data.get("blockType") or node.get("type") or "unknown"
        params = data.get("params") or {}
        node_id = node.get("id", "?")
        if params:
            param_str = ", ".join(f"{k}={v}" for k, v in params.items())
            lines.append(f"  [{node_id}] {block_type}: {param_str}")
        else:
            lines.append(f"  [{node_id}] {block_type}")

    if edges:
        lines.append("")
        lines.append("Connections:")
        for edge in edges:
            lines.append(f"  {edge.get('source', '?')} → {edge.get('target', '?')}")

    lines.append("")
    if training_results and any(
        v is not None for v in [training_results.accuracy, training_results.loss, training_results.epochs]
    ):
        parts = []
        if training_results.accuracy is not None:
            parts.append(f"accuracy={training_results.accuracy:.1%}")
        if training_results.loss is not None:
            parts.append(f"loss={training_results.loss:.4f}")
        if training_results.epochs is not None:
            parts.append(f"epochs_completed={training_results.epochs}")
        if training_results.training_time_seconds is not None:
            parts.append(f"training_time={training_results.training_time_seconds:.1f}s")
        lines.append(f"Latest training results: {', '.join(parts)}")
    else:
        lines.append("Training status: this architecture has not been trained yet.")

    return "\n".join(lines)


def _check_graph_warnings(reply: str, graph: dict[str, Any]) -> list[str]:
    """Check the graph for situations where the tutor's suggestion may not apply."""
    warnings: list[str] = []
    reply_lower = reply.lower()
    nodes = graph.get("nodes") or []

    block_types = []
    for node in nodes:
        data = node.get("data") or {}
        bt = (data.get("blockType") or node.get("type") or "").lower()
        block_types.append(bt)

    dataset = str(graph.get("dataset") or "").lower().strip()
    has_flatten = "flatten" in block_types
    has_linear = "linear" in block_types
    has_output = "output" in block_types

    # Conv2d suggested but graph already flattened before linear layers
    if any(kw in reply_lower for kw in ["conv2d", "convolutional", "conv layer", "convolution"]):
        if has_flatten and has_linear:
            warnings.append(
                "⚠ Graph note: Your graph already has a Flatten layer before Linear layers. "
                "Conv2d requires 2D spatial input (H×W×C) and must come before any Flatten — "
                "it cannot be placed after the data has been flattened into a 1D vector."
            )

    # Recurrent layers suggested on image datasets
    if any(kw in reply_lower for kw in ["lstm", "rnn", "gru", "recurrent"]):
        image_datasets = {"mnist", "fashionmnist", "fashion_mnist", "cifar10", "cifar-10"}
        if dataset in image_datasets:
            warnings.append(
                f"⚠ Graph note: Your dataset is {dataset.upper()}, which is an image dataset. "
                "Recurrent layers (LSTM/RNN/GRU) are designed for sequential data like text or time series. "
                "They are unconventional for image classification and will likely underperform a CNN or MLP here."
            )

    # BatchNorm suggested but graph has too few layers
    if any(kw in reply_lower for kw in ["batchnorm", "batch norm", "batch normalization"]):
        hidden_layers = [bt for bt in block_types if bt not in ("dataset", "output")]
        if len(hidden_layers) < 2:
            warnings.append(
                "⚠ Graph note: Your graph currently has fewer than two hidden layers. "
                "BatchNorm normalizes the output of a preceding layer — it needs at least one "
                "Linear or Conv2d layer before it to be meaningful."
            )

    # Missing output block — always flag
    if not has_output:
        warnings.append(
            "⚠ Graph note: Your graph is missing an Output (Model) block. "
            "Without it the graph has no defined endpoint and training will fail."
        )

    return warnings


@router.post("/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(request: AssistantChatRequest, user_id: str = Depends(get_current_user_id)):
    """Chat with an AI tutor using the student's graph and training results as context."""
    prompt = (request.message or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    graph_summary = _build_graph_summary(request.graph or {}, request.training_results)
    system_prompt = f"{_TUTOR_SYSTEM_PROMPT}\n\n---\nStudent's current context:\n{graph_summary}"

    history_messages = [
        {"role": m.role, "content": m.content}
        for m in request.history
        if (m.content or "").strip()
    ]
    messages = [*history_messages, {"role": "user", "content": prompt}]

    try:
        model = request.model or "gpt-4o"
        reply = run_openai_messages(messages=messages, system=system_prompt, model=model)

        # Append any graph-specific warnings that are triggered by the reply
        graph_warnings = _check_graph_warnings(reply, request.graph or {})
        if graph_warnings:
            reply = reply.rstrip() + "\n\n" + "\n".join(graph_warnings)

        return AssistantChatResponse(provider="openai", model=model, reply=reply)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant request failed: {str(e)}") from e

print("DEBUG: assistant_chat route defined", flush=True)

@router.post("/save")
async def save_model(request: SaveModelRequest, user_id: str = Depends(get_current_user_id)):
    """Registers a newly trained model in the database."""
    
    supabase = get_supabase()
    base_model_name = _extract_output_model_name(request.graph_json or {}, fallback=request.name)
    model_name = _next_available_model_name(user_id, base_model_name)
    
    # We expect the weights to have been uploaded by the worker (e.g. Modal)
    # or we handle the weights upload here. For now, we mock the path.
    # A real implementation would accept a file upload or a pre-signed URL.
    weights_path = f"{user_id}/{uuid.uuid4()}.pt"
    
    record = {
        "user_id": user_id,
        "name": model_name,
        "graph_json": request.graph_json,
        "weights_path": weights_path,
        "dataset": request.dataset,
        "accuracy": request.accuracy,
        "loss": request.loss,
        "epochs": request.epochs,
        "training_time_seconds": request.training_time_seconds
    }
    
    response = supabase.table("trained_models").insert(record).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to save model metadata")
        
    return response.data[0]


@router.post("/export/python")
async def export_python_script(request: ExportPythonRequest, user_id: str = Depends(get_current_user_id)):
    """Generate a runnable Python training script from graph JSON."""
    graph_payload = dict(request.graph_json or {})
    if request.dataset and not graph_payload.get("dataset"):
        graph_payload["dataset"] = request.dataset

    try:
        code = graph_json_to_code(graph_payload)
        return {"code": code}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export python code: {str(e)}") from e

@router.get("/")
async def list_models(user_id: str = Depends(get_current_user_id)):
    """Lists all models trained by the current user."""
    supabase = get_supabase()
    response = supabase.table("trained_models").select("id, name, dataset, accuracy, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
    
    return response.data

@router.delete("/{model_id}")
async def delete_model(model_id: str, user_id: str = Depends(get_current_user_id)):
    """Deletes a model and associated weights from storage."""
    try:
        supabase = get_supabase()
        # Find weights path first
        model_resp = supabase.table("trained_models").select("weights_path").eq("id", model_id).eq("user_id", user_id).execute()
        if not model_resp.data:
            raise HTTPException(status_code=404, detail="Model not found")
        
        weights_path = model_resp.data[0].get("weights_path")

        # Delete database row
        supabase.table("trained_models").delete().eq("id", model_id).eq("user_id", user_id).execute()
        
        # Delete from storage
        if weights_path:
            try:
                supabase.storage.from_("ai-models").remove([weights_path])
            except Exception as e:
                print(f"Failed to delete weights file from storage: {e}")

        return {"status": "success"}
    except Exception as e:
        print(f"Error deleting model {model_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{model_id}/predict")
async def predict(model_id: str, request: PredictRequest, user_id: str = Depends(get_current_user_id)):
    """Runs data through a trained model and returns the output tensor."""
    try:
        print(f"Predict request received for model {model_id} from user {user_id}", flush=True)
        print(f"Input data type: {type(request.input_data)}, len: {len(request.input_data)}", flush=True)
        output = inference_service.predict(model_id, user_id, request.input_data)
        return {"output": output}
    except Exception as e:
        print(f"Prediction error for model {model_id}: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{model_id}/weights")
async def get_model_weights(model_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Download the trained .pt file for model_id and return per-layer weight stats
    plus a 12×20 sampled heatmap grid for each layer that has learnable parameters.

    Response shape:
        {
          "layers": {
            "0": {
              "shape": [out, in],
              "stats": { "min", "max", "mean", "std" },
              "sample": [240 floats, row-major 12×20],
              "rows": 12,
              "cols": 20
            },
            ...
          }
        }
    Layer keys are string integers matching nn.Sequential indices.
    Layers with no learnable parameters (ReLU, Flatten, etc.) are omitted.
    """
    import io
    import torch
    import numpy as np

    supabase = get_supabase()

    resp = supabase.table("trained_models") \
        .select("weights_path") \
        .eq("id", model_id) \
        .eq("user_id", user_id) \
        .execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Model not found")

    weights_path = resp.data[0].get("weights_path")
    if not weights_path:
        raise HTTPException(status_code=404, detail="Model has no weights file")

    try:
        weights_bytes = supabase.storage.from_("ai-models").download(weights_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download weights: {e}")

    if len(weights_bytes) < 256 or weights_bytes[:4] != b"PK\x03\x04":
        raise HTTPException(
            status_code=422,
            detail="Weights file is corrupted or truncated — retrain the model."
        )

    buf = io.BytesIO(weights_bytes)
    try:
        state_dict = torch.load(buf, map_location="cpu", weights_only=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse weights: {e}")

    # Group tensors by their top-level sequential index ("0", "1", "2", ...)
    layer_groups: dict[int, dict[str, torch.Tensor]] = {}
    for key, tensor in state_dict.items():
        parts = key.split(".")
        if not parts[0].isdigit():
            continue
        layer_idx = int(parts[0])
        param_key = ".".join(parts[1:])
        if layer_idx not in layer_groups:
            layer_groups[layer_idx] = {}
        # Only float tensors (skip running_mean / num_batches_tracked etc. that have no grad)
        if isinstance(tensor, torch.Tensor) and tensor.dtype in (torch.float32, torch.float16, torch.bfloat16):
            layer_groups[layer_idx][param_key] = tensor.float()

    ROWS, COLS = 12, 20
    SAMPLE_SIZE = ROWS * COLS

    result: dict[str, dict] = {}

    for idx in sorted(layer_groups.keys()):
        params = layer_groups[idx]
        if not params:
            continue

        # Pick the primary weight tensor: prefer key ending in "weight", else take largest
        primary: torch.Tensor | None = None
        for k, t in params.items():
            if k.endswith("weight") or k == "weight":
                if primary is None or t.numel() > primary.numel():
                    primary = t
        if primary is None:
            primary = max(params.values(), key=lambda t: t.numel())

        flat = primary.reshape(-1).numpy().astype(np.float32)

        # Sample evenly across the full flat tensor
        if len(flat) >= SAMPLE_SIZE:
            indices = np.round(np.linspace(0, len(flat) - 1, SAMPLE_SIZE)).astype(int)
            sample = flat[indices]
        else:
            # Tile + truncate so we always return exactly ROWS×COLS values
            repeats = int(np.ceil(SAMPLE_SIZE / max(len(flat), 1)))
            sample = np.tile(flat, repeats)[:SAMPLE_SIZE]

        result[str(idx)] = {
            "shape": list(primary.shape),
            "stats": {
                "min":  round(float(primary.min()), 6),
                "max":  round(float(primary.max()), 6),
                "mean": round(float(primary.mean()), 6),
                "std":  round(float(primary.std()) if primary.numel() > 1 else 0.0, 6),
            },
            "sample": sample.tolist(),
            "rows": ROWS,
            "cols": COLS,
        }

    return {"layers": result}


@router.post("/debug_test")
async def debug_test():
    return {"message": "Debug test works"}
