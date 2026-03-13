from typing import Any
import io
import json
import torch

from db.supabase import get_supabase
from services.local_runner import deserialize_model, convert_graph_json


class InferenceService:
    def __init__(self):
        self.supabase = get_supabase()
        self.bucket = "ai-models"

    def load_model(self, model_id: str, user_id: str) -> dict[str, Any]:
        """Loads a model's metadata and weights from Supabase."""
        
        # 1. Fetch metadata & graph JSON from DB
        response = self.supabase.table("trained_models").select("*").eq("id", model_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise ValueError(f"Model {model_id} not found or access denied.")
            
        model_record = response.data[0]
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
        """Loads model and runs a single inference pass."""
        
        loaded = self.load_model(model_id, user_id)
        model = loaded["model"]
        pipeline = loaded["pipeline"]
        
        # Determine input dtype (e.g. float vs long for embeddings)
        first_layer = next(
            (n.get("type", "").lower() for n in pipeline if n.get("type", "").lower() not in {"dataset", "output"}),
            None,
        )
        dtype = torch.long if first_layer in ("embedding", "embeddingbag") else torch.float32

        # Run inference
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        
        x = torch.tensor(input_data, dtype=dtype).to(device)
        dataset_name = str(loaded["metadata"].get("dataset") or "")
        self._validate_input_tensor(x, dataset_name)
        print(f"Running inference with input shape: {x.shape}", flush=True)
        
        with torch.no_grad():
            output = model(x)
            
        return output.tolist()

inference_service = InferenceService()
