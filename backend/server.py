print("SCRATCH_MY_AI_SERVER_STARTING", flush=True)
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import models

load_dotenv(Path(__file__).resolve().parent / ".env.local")


def _get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app = FastAPI(title="ScratchMyAI API", version="0.1.0")

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"REQUEST: {request.method} {request.url.path}", flush=True)
    response = await call_next(request)
    print(f"RESPONSE: {response.status_code}", flush=True)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router)


@app.get("/health")
def health():
    return {"status": "ok"}
