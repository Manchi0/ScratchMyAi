print("AXONX_SERVER_STARTING", flush=True)
import os
from pathlib import Path

import json
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from api.routes import models

load_dotenv(Path(__file__).resolve().parent / ".env.local")


def _get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app = FastAPI(title="AxonX API", version="0.1.0")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        body = await request.body()
        body_text = body.decode("utf-8", errors="replace")
    except Exception:
        body_text = "<unreadable>"
    print(f"VALIDATION ERROR on {request.method} {request.url.path}", flush=True)
    print(f"  errors: {json.dumps(exc.errors(), indent=2)}", flush=True)
    print(f"  body:   {body_text}", flush=True)
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

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

print("DEBUG: Registered routes:", [r.path for r in app.routes], flush=True)



@app.get("/health")
def health():
    return {"status": "ok"}
