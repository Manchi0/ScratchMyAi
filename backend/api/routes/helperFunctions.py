from typing import Any
import uuid
import json
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


def _create_artifact_upload_contract(user_id: str) -> tuple[str, str]:
    file_path = f"{user_id}/{uuid.uuid4().hex[:8]}.pt"
    supabase = get_supabase()
    signed = supabase.storage.from_("ai-models").create_signed_upload_url(file_path)
    signed_url = signed.get("signed_url") or signed.get("signedUrl")

    if not signed_url:
        raise ValueError("Supabase did not return a signed upload URL")

    return file_path, signed_url


def training_stream_generator(request: TrainRequest, user_id: str):
    graph_payload = dict(request.graph_json or {})
    if not graph_payload.get("dataset") and request.dataset:
        graph_payload["dataset"] = request.dataset

    selected_dataset = graph_payload.get("dataset") or request.dataset
    try:
        file_path, signed_upload_url = _create_artifact_upload_contract(user_id)
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Could not prepare model artifact upload URL: {str(e)}'})}\n\n"
        return

    code = graph_json_to_code(graph_payload, signed_upload_url=signed_upload_url)

    yield f"data: {json.dumps({'type': 'log', 'message': f'Selected dataset: {selected_dataset}'})}\n\n"
    yield f"data: {json.dumps({'type': 'log', 'message': 'Booting up Modal GPU Container...'})}\n\n"

    artifact_uploaded = False
    artifact_upload_error = None
    exit_code = -1
    training_started_at = time.perf_counter()
    final_accuracy = None
    final_loss = None
    final_epochs = None
    saw_keyboard_interrupt = False

    # CIFAR-10 runs can exceed short sandbox limits due to dataset download + CPU transforms.
    training_config = graph_payload.get("training_config", {})
    try:
        configured_epochs = int(training_config.get("epochs", 10))
    except Exception:
        configured_epochs = 10
    ds_key = str(selected_dataset or "").lower().strip()
    per_epoch_seconds = 55 if ds_key in ("cifar10", "cifar-10") else 20
    sandbox_timeout = max(300, min(3600, 180 + configured_epochs * per_epoch_seconds))

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
        # Exclude Python warnings — they are informational, not failures.
        if "warning" in lowered or "deprecat" in lowered:
            return False
        error_markers = (
            "traceback",
            "runtimeerror",
            "valueerror",
            "typeerror",
            "assertionerror",
            "modulenotfounderror",
            "attributeerror",
            "indexerror",
        )
        return any(marker in lowered for marker in error_markers)

    try:
        yield f"data: {json.dumps({'type': 'log', 'message': 'Creating ephemeral Modal app context...'})}\n\n"
        app = modal.App("scratch-my-ai-training")
        with app.run():
            # gpu="any" ensures it gets scheduled on whichever GPU is free (T4, L4, A10g)
            yield f"data: {json.dumps({'type': 'log', 'message': 'Provisioning GPU sandbox (can take up to 60s on cold start)...'})}\n\n"
            yield f"data: {json.dumps({'type': 'log', 'message': f'Using sandbox timeout: {sandbox_timeout}s'})}\n\n"
            sandbox = modal.Sandbox.create(
                "python", "-u", "-c", code,
                image=modal.Image.debian_slim().pip_install("torch", "torchvision", "numpy<2.4"),
                gpu="any",
                timeout=sandbox_timeout,
                app=app,
            )
            yield f"data: {json.dumps({'type': 'log', 'message': 'Sandbox started. Streaming logs...'})}\n\n"

            for message in sandbox.stdout:
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
                    continue

                if stripped.startswith("ARTIFACT_UPLOADED:"):
                    artifact_uploaded = True
                    yield f"data: {json.dumps({'type': 'log', 'message': 'Model artifact uploaded to storage.'})}\n\n"
                    continue

                if stripped.startswith("ARTIFACT_UPLOAD_FAILED:") or stripped.startswith("ARTIFACT_UPLOAD_ERROR:"):
                    artifact_upload_error = stripped
                    yield f"data: {json.dumps({'type': 'error', 'message': stripped})}\n\n"
                    continue

                loss_match = loss_pattern.search(stripped)
                if loss_match:
                    final_loss = float(loss_match.group(1))

                accuracy_match = accuracy_pattern.search(stripped)
                if accuracy_match:
                    final_accuracy = float(accuracy_match.group(1)) / 100.0

                if stripped.startswith("METRIC_JSON:"):
                    continue

                yield f"data: {json.dumps({'type': 'log', 'message': stripped})}\n\n"

            for message in sandbox.stderr:
                stripped_err = normalize_line(message)
                if not stripped_err:
                    continue
                if is_progress_noise(stripped_err):
                    continue
                if "keyboardinterrupt" in stripped_err.lower():
                    saw_keyboard_interrupt = True
                line_type = "error" if is_real_error_line(stripped_err) else "log"
                yield f"data: {json.dumps({'type': line_type, 'message': stripped_err})}\n\n"

            sandbox.wait()
            exit_code = sandbox.returncode
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Sandbox execution failed: {str(e)}'})}\n\n"
        return

    if exit_code == 0 and artifact_uploaded:
        yield f"data: {json.dumps({'type': 'log', 'message': 'Training complete! Saving model to registry...'})}\n\n"
        try:
            supabase = get_supabase()
            training_time_seconds = round(time.perf_counter() - training_started_at, 3)
            configured_epochs = graph_payload.get("training_config", {}).get("epochs")
            persisted_epochs = final_epochs if final_epochs is not None else configured_epochs

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

            yield f"data: {json.dumps({'type': 'done', 'model_id': model_id, 'accuracy': final_accuracy, 'loss': final_loss, 'epochs': persisted_epochs, 'training_time_seconds': training_time_seconds})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to save to Supabase: {str(e)}'})}\n\n"
    else:
        error_message = f"Training failed with exit code {exit_code}"
        if exit_code == 0 and not artifact_uploaded:
            if artifact_upload_error:
                error_message = f"Training finished but artifact upload failed: {artifact_upload_error}"
            else:
                error_message = "Training finished but artifact upload confirmation was missing"
        if saw_keyboard_interrupt:
            error_message += " (likely sandbox timeout/interruption; try fewer epochs or higher timeout)"
        yield f"data: {json.dumps({'type': 'error', 'message': error_message})}\n\n"
