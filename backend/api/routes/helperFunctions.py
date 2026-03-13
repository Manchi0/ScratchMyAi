from typing import Any
import uuid
import json
import base64
import re
import time

import modal
from fastapi import HTTPException, Header
from pydantic import BaseModel

from db.supabase import get_supabase
from services.code_generator import graph_json_to_code


async def get_current_user_id(authorization: str = Header(None)) -> str:
    """Extract and validate the current user from Supabase JWT."""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header provided")

    token = authorization.replace("Bearer ", "")
    supabase = get_supabase()

    try:
        user_resp = supabase.auth.get_user(token)
        if not user_resp.user:
            print("Invalid token - no user in response", flush=True)
            raise HTTPException(status_code=401, detail="Invalid token")
        print(f"Authenticated user: {user_resp.user.id}", flush=True)
        return user_resp.user.id
    except Exception as e:
        print(f"Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")


class TrainRequest(BaseModel):
    name: str
    dataset: str
    graph_json: dict[str, Any]


def training_stream_generator(request: TrainRequest, user_id: str):
    graph_payload = dict(request.graph_json or {})
    if not graph_payload.get("dataset") and request.dataset:
        graph_payload["dataset"] = request.dataset

    selected_dataset = graph_payload.get("dataset") or request.dataset
    code = graph_json_to_code(graph_payload, include_base64_export=True)
    print("--- GENERATED TRAINING CODE ---", flush=True)
    print(code, flush=True)
    print("-------------------------------", flush=True)

    yield f"data: {json.dumps({'type': 'log', 'message': f'Selected dataset: {selected_dataset}'})}\n\n"
    yield f"data: {json.dumps({'type': 'log', 'message': 'Booting up Modal GPU Container...'})}\n\n"

    weights_b64 = None
    exit_code = -1
    training_started_at = time.perf_counter()
    final_accuracy = None
    final_loss = None
    final_epochs = None

    loss_pattern = re.compile(r"Loss:\s*([0-9]+(?:\.[0-9]+)?)")
    accuracy_pattern = re.compile(r"Test accuracy:\s*([0-9]+(?:\.[0-9]+)?)%")

    # Suppress tqdm/download progress spam like "0.3% 0.7% ... 100.0%"
    progress_only_pattern = re.compile(r"^(?:\d+(?:\.\d+)?%\s*)+$")
    ansi_escape_pattern = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")

    def normalize_line(raw: str) -> str:
        # Remove ANSI escape sequences and carriage-return artifacts from tqdm.
        line = ansi_escape_pattern.sub("", raw or "")
        line = line.replace("\r", "").strip()
        return line

    def is_progress_noise(line: str) -> bool:
        if not line:
            return True
        if progress_only_pattern.match(line):
            return True
        # Typical tqdm / downloader lines containing only progress metadata.
        if "%|" in line:
            return True
        if ("it/s" in line or "/s" in line) and "%" in line:
            return True
        return False

    def is_real_error_line(line: str) -> bool:
        lowered = line.lower()
        error_markers = (
            "traceback",
            "error",
            "exception",
            "failed",
            "runtimeerror",
            "valueerror",
            "typeerror",
            "assertionerror",
        )
        return any(marker in lowered for marker in error_markers)

    try:
        yield f"data: {json.dumps({'type': 'log', 'message': 'Creating ephemeral Modal app context...'})}\n\n"
        app = modal.App("scratch-my-ai-training")
        with app.run():
            # gpu="any" ensures it gets scheduled on whichever GPU is free (T4, L4, A10g)
            yield f"data: {json.dumps({'type': 'log', 'message': 'Provisioning GPU sandbox (can take up to 60s on cold start)...'})}\n\n"
            sandbox = modal.Sandbox.create(
                "python", "-c", code,
                image=modal.Image.debian_slim().pip_install("torch", "torchvision"),
                gpu="any",
                timeout=300,
                app=app,
            )
            yield f"data: {json.dumps({'type': 'log', 'message': 'Sandbox started. Streaming logs...'})}\n\n"

            collecting_weights = False
            weights_buffer = []

            for message in sandbox.stdout:
                if "====MODEL_WEIGHTS_BEGIN====" in message:
                    collecting_weights = True
                    continue
                elif "====MODEL_WEIGHTS_END====" in message:
                    collecting_weights = False
                    weights_b64 = "".join(weights_buffer)
                    continue

                if collecting_weights:
                    weights_buffer.append(message.strip())
                else:
                    stripped = normalize_line(message)
                    if not stripped:
                        continue

                    if is_progress_noise(stripped):
                        continue

                    if stripped.startswith("METRIC_JSON:"):
                        try:
                            metrics = json.loads(stripped.replace("METRIC_JSON:", "", 1).strip())
                            if metrics.get("accuracy") is not None:
                                final_accuracy = float(metrics["accuracy"])
                            if metrics.get("loss") is not None:
                                final_loss = float(metrics["loss"])
                            if metrics.get("epochs") is not None:
                                final_epochs = int(metrics["epochs"])
                        except Exception:
                            pass

                    loss_match = loss_pattern.search(stripped)
                    if loss_match:
                        final_loss = float(loss_match.group(1))

                    accuracy_match = accuracy_pattern.search(stripped)
                    if accuracy_match:
                        final_accuracy = float(accuracy_match.group(1)) / 100.0

                    # Hide machine-readable metric line from UI logs.
                    if stripped.startswith("METRIC_JSON:"):
                        continue

                    yield f"data: {json.dumps({'type': 'log', 'message': stripped})}\n\n"

            for message in sandbox.stderr:
                stripped_err = normalize_line(message)
                if not stripped_err:
                    continue
                if is_progress_noise(stripped_err):
                    continue
                line_type = "error" if is_real_error_line(stripped_err) else "log"
                yield f"data: {json.dumps({'type': line_type, 'message': stripped_err})}\n\n"

            sandbox.wait()
            exit_code = sandbox.returncode
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to start sandbox: {str(e)}'})}\n\n"
        return

    if exit_code == 0 and weights_b64:
        yield f"data: {json.dumps({'type': 'log', 'message': 'Training complete! Saving model to registry...'})}\n\n"
        try:
            weights_bytes = base64.b64decode(weights_b64)
            file_path = f"{user_id}/{uuid.uuid4().hex[:8]}.pt"
            supabase = get_supabase()
            training_time_seconds = round(time.perf_counter() - training_started_at, 3)
            configured_epochs = graph_payload.get("training_config", {}).get("epochs")
            persisted_epochs = final_epochs if final_epochs is not None else configured_epochs

            supabase.storage.from_("ai-models").upload(
                file_path,
                weights_bytes,
                file_options={"content-type": "application/octet-stream"}
            )

            record = {
                "user_id": user_id,
                "name": request.name,
                "dataset": selected_dataset,
                "graph_json": graph_payload,
                "weights_path": file_path,
                "accuracy": final_accuracy,
                "loss": final_loss,
                "epochs": persisted_epochs,
                "training_time_seconds": training_time_seconds,
            }
            resp = supabase.table("trained_models").insert(record).execute()
            model_id = resp.data[0]["id"]

            yield f"data: {json.dumps({'type': 'done', 'model_id': model_id})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to save to Supabase: {str(e)}'})}\n\n"
    else:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Training failed with exit code {exit_code}'})}\n\n"
