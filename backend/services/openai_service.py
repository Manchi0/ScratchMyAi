import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    return _client


def run_messages(
    messages: list[dict[str, Any]],
    system: str = "You are a helpful AI assistant inside a visual programming environment.",
    model: str = "gpt-4.1-mini",
    max_tokens: int = 2048,
) -> str:
    """Run a multi-turn conversation and return OpenAI's text response."""
    client = get_client()

    cleaned_messages: list[dict[str, str]] = []
    for message in messages:
        role = message.get("role")
        content = str(message.get("content", "")).strip()
        if role in {"user", "assistant"} and content:
            cleaned_messages.append({"role": role, "content": content})

    if not cleaned_messages:
        raise ValueError("At least one valid message is required")

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, *cleaned_messages],
        max_tokens=max_tokens,
    )

    return (response.choices[0].message.content or "").strip()
