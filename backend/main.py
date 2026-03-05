from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api.routes import blocks, claude, projects

app = FastAPI(title="ScratchMyAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(blocks.router)
app.include_router(claude.router)
app.include_router(projects.router)


@app.get("/health")
def health():
    return {"status": "ok"}
