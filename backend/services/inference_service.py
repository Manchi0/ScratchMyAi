from typing import Any
import io
import json
from pathlib import Path

import modal
import torch

from db.supabase import get_supabase
from services.local_runner import deserialize_model, convert_graph_json


class InferenceService:
    def __init__(self):
        self.supabase = get_supabase()
        self.bucket = "ai-models"
        backend_root = Path(__file__).resolve().parents[1]
        self.modal_image = (
            modal.Image.debian_slim()
            .pip_install("torch", "torchvision", "numpy<2.4")
            .add_local_dir(str(backend_root / "services"), remote_path="/workspace/services")
        )

    def _get_model_record(self, model_id: str, user_id: str) -> dict[str, Any]:
        response = self.supabase.table("trained_models").select("*").eq("id", model_id).eq("user_id", user_id).execute()
        if not response.data:
            raise ValueError(f"Model {model_id} not found or access denied.")
        return response.data[0]

    def _create_weights_download_url(self, weights_path: str, expires_in_seconds: int = 1800) -> str:
        signed = self.supabase.storage.from_(self.bucket).create_signed_url(weights_path, expires_in_seconds)
        signed_url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("signed_url")
        if not signed_url:
            raise ValueError("Supabase did not return a signed download URL for model weights")
        return signed_url

    def _run_inference_in_modal(
        self,
        graph_json: dict[str, Any],
        weights_signed_url: str,
        input_data: list[Any],
        dtype_name: str,
    ) -> list[Any]:
        graph_json_literal = json.dumps(json.dumps(graph_json))
        input_data_literal = json.dumps(json.dumps(input_data))
        weights_url_literal = json.dumps(weights_signed_url)
        dtype_literal = json.dumps(dtype_name)

        code = f"""import io
import json
import urllib.request
import torch
import sys

sys.path.insert(0, "/workspace")
from services.local_runner import convert_graph_json, deserialize_model

graph_json = json.loads({graph_json_literal})
input_data = json.loads({input_data_literal})
weights_url = {weights_url_literal}
dtype_name = {dtype_literal}

with urllib.request.urlopen(weights_url, timeout=120) as resp:
    weights_bytes = resp.read()

pipeline = convert_graph_json(graph_json)
model = deserialize_model(pipeline, weights_bytes)
model.eval()

first_layer = next(
    (n.get("type", "").lower() for n in pipeline if n.get("type", "").lower() not in {{"dataset", "output"}}),
    None,
)
dtype = torch.long if dtype_name == "long" or first_layer in ("embedding", "embeddingbag") else torch.float32
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

x = torch.tensor(input_data, dtype=dtype).to(device)
with torch.no_grad():
    output = model(x)

print("INFERENCE_JSON:" + json.dumps(output.tolist()), flush=True)
"""

        app = modal.App("scratch-my-ai-inference")
        output_json = None
        stderr_lines: list[str] = []

        with app.run():
            sandbox = modal.Sandbox.create(
                "python", "-u", "-c", code,
                image=self.modal_image,
                gpu="any",
                timeout=300,
                app=app,
            )

            for message in sandbox.stdout:
                stripped = (message or "").strip()
                if not stripped:
                    continue
                if stripped.startswith("INFERENCE_JSON:"):
                    output_json = stripped.replace("INFERENCE_JSON:", "", 1)

            for message in sandbox.stderr:
                stripped_err = (message or "").strip()
                if stripped_err:
                    stderr_lines.append(stripped_err)

            sandbox.wait()
            if sandbox.returncode != 0:
                raise ValueError(
                    f"Modal inference failed with exit code {sandbox.returncode}. "
                    f"Stderr: {' | '.join(stderr_lines[-5:]) if stderr_lines else 'none'}"
                )

        if not output_json:
            raise ValueError("Modal inference finished without returning prediction output")

        return json.loads(output_json)

    def load_model(self, model_id: str, user_id: str) -> dict[str, Any]:
        """Loads a model's metadata and weights from Supabase."""
        
        # 1. Fetch metadata & graph JSON from DB
        model_record = self._get_model_record(model_id, user_id)
        graph_json = model_record["graph_json"]
        weights_path = model_record["weights_path"]

        # 2. Fetch weights from Storage
        print(f"Downloading weights from {weights_path}...", flush=True)
        res = self.supabase.storage.from_(self.bucket).download(weights_path)
        print(f"Weights downloaded, size: {len(res)} bytes", flush=True)

        # PyTorch zip-format .pt files start with the magic bytes PK\x03\x04.
        # A truncated upload (e.g. from a buffered stdout race) will fail with
        # a confusing "negative seek value" error — catch it early.
        if len(res) < 256 or res[:4] != b"PK\x03\x04":
            raise ValueError(
                f"Weights file appears corrupted or truncated ({len(res)} bytes). "
                "Please retrain the model to generate a valid checkpoint."
            )

        # 3. Instantiate PyTorch model
        print("Instantiating model...", flush=True)
        pipeline = convert_graph_json(graph_json)
        model = deserialize_model(pipeline, res)
        model.eval()
        print("Model ready.", flush=True)
        
        return {
            "metadata": model_record,
            "model": model,
            "pipeline": pipeline
        }

    def _validate_input_tensor(self, x: torch.Tensor, dataset_name: str) -> None:
        if x.numel() == 0:
            raise ValueError("input_data is empty")

        if not torch.isfinite(x).all():
            raise ValueError("input_data contains NaN or infinite values")

        ds = (dataset_name or "").lower().strip()
        if ds in ("mnist", "fashionmnist", "fashion_mnist", "fashion-mnist"):
            if x.dim() != 4:
                raise ValueError("Expected input rank 4 for MNIST/FashionMNIST: [batch, 1, 28, 28]")
            _, channels, height, width = x.shape
            if channels != 1 or height != 28 or width != 28:
                raise ValueError("Expected input shape [batch, 1, 28, 28] for MNIST/FashionMNIST")
        elif ds in ("cifar10", "cifar-10"):
            if x.dim() != 4:
                raise ValueError("Expected input rank 4 for CIFAR-10: [batch, 3, 32, 32]")
            _, channels, height, width = x.shape
            if channels != 3 or height != 32 or width != 32:
                raise ValueError("Expected input shape [batch, 3, 32, 32] for CIFAR-10")

    def predict(self, model_id: str, user_id: str, input_data: list[Any]) -> list[Any]:
        """Runs inference remotely in Modal using the stored graph and weights."""
        model_record = self._get_model_record(model_id, user_id)
        graph_json = model_record["graph_json"]
        weights_path = model_record["weights_path"]

        pipeline = convert_graph_json(graph_json)
        first_layer = next(
            (n.get("type", "").lower() for n in pipeline if n.get("type", "").lower() not in {"dataset", "output"}),
            None,
        )
        dtype = torch.long if first_layer in ("embedding", "embeddingbag") else torch.float32

        x = torch.tensor(input_data, dtype=dtype)
        dataset_name = str(model_record.get("dataset") or "")
        self._validate_input_tensor(x, dataset_name)

        signed_url = self._create_weights_download_url(weights_path)
        dtype_name = "long" if dtype == torch.long else "float32"
        return self._run_inference_in_modal(graph_json, signed_url, input_data, dtype_name)

inference_service = InferenceService()
