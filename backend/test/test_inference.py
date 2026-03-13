"""
Test: Verify the Model Registry and Inference cycle via Supabase.

1. Create a dummy model using the local builder.
2. Save weights to a BytesIO buffer (simulating what Modal returns).
3. Upload to Supabase Storage.
4. Insert metadata to Supabase DB.
5. Use InferenceService to fetch the model and run a prediction.
"""

import sys
import os
import io
import json
import torch
import torch.nn as nn
import uuid

# Setup paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db.supabase import get_supabase
from services.local_runner import build_model, convert_graph_json
from services.inference_service import inference_service

def test_inference_lifecycle():
    supabase = get_supabase()
    
    # Fetch a valid user_id to satisfy the foreign key constraint
    auth_resp = supabase.table("graphs").select("user_id").limit(1).execute()
    if not auth_resp.data:
        print("No users found in DB to attach the model to. Please sign in once.")
        return
        
    user_id = auth_resp.data[0]["user_id"]
    
    print("1. Creating dummy architecture from JSON...")
    json_path = os.path.join(os.path.dirname(__file__), "..", "example", "MNIST_Input.json")
    with open(json_path, "r") as f:
        graph = json.load(f)
        
    pipeline = convert_graph_json(graph)
    model = build_model(pipeline)
    
    # Initialize with some random weights to pretend it's trained
    model.apply(lambda m: {
        nn.init.normal_(m.weight) if hasattr(m, "weight") else None
    })
    
    print("2. Saving dummy state_dict to buffer...")
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    state_bytes = buf.getvalue()
    
    print("3. Uploading weights to Supabase Storage...")
    file_path = f"{user_id}/test_{uuid.uuid4().hex[:8]}.pt"
    supabase.storage.from_("ai-models").upload(
        file_path, 
        state_bytes, 
        file_options={"content-type": "application/octet-stream"}
    )
    
    print("4. Saving Model Metadata to DB...")
    record = {
        "user_id": user_id,
        "name": "E2E Test Model",
        "dataset": "mnist",
        "graph_json": graph,
        "weights_path": file_path,
        "accuracy": 0.42
    }
    
    response = supabase.table("trained_models").insert(record).execute()
    model_id = response.data[0]["id"]
    print(f"   -> Saved with ID: {model_id}")
    
    print("5. Running Inference via InferenceService...")
    # Create a batch of 1 dummy MNIST image: shape [1, 1, 28, 28] == 784 flat
    dummy_input = torch.randn(1, 784).tolist()
    
    outputs = inference_service.predict(model_id, user_id, dummy_input)
    
    print("6. Prediction Results:")
    print("   Output Tensor Shape:", len(outputs), "x", len(outputs[0]))
    print("   Output Vectors:", outputs)
    
    print("\n✅ End-to-End Test Passed!")
    
    # Cleanup DB and Storage so tests don't leave residue
    print("7. Cleaning up test data...")
    supabase.table("trained_models").delete().eq("id", model_id).execute()
    supabase.storage.from_("ai-models").remove([file_path])
    print("   Cleanup OK.")

if __name__ == "__main__":
    test_inference_lifecycle()
