from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, List
import uuid

from db.supabase import get_supabase
from services.inference_service import inference_service
from api.routes.helperFunctions import (
    TrainRequest,
    get_current_user_id,
    training_stream_generator,
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

@router.post("/save")
async def save_model(request: SaveModelRequest, user_id: str = Depends(get_current_user_id)):
    """Registers a newly trained model in the database."""
    
    supabase = get_supabase()
    
    # We expect the weights to have been uploaded by the worker (e.g. Modal)
    # or we handle the weights upload here. For now, we mock the path.
    # A real implementation would accept a file upload or a pre-signed URL.
    weights_path = f"{user_id}/{uuid.uuid4()}.pt"
    
    record = {
        "user_id": user_id,
        "name": request.name,
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
