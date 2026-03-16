import os
from pathlib import Path
from typing import Any

import anthropic
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    return _client


def run_prompt(
    prompt: str,
    system: str = "You are a helpful AI assistant inside a visual programming environment.",
    model: str = "claude-opus-4-6",
    max_tokens: int = 2048,
) -> str:
    client = get_client()
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def run_messages(
    messages: list[dict[str, Any]],
    system: str = "You are a helpful AI assistant inside a visual programming environment.",
    model: str = "claude-opus-4-6",
    max_tokens: int = 2048,
) -> str:
    """Run a multi-turn conversation and return Claude's text response."""
    client = get_client()
    cleaned_messages = [
        {
            "role": m.get("role"),
            "content": str(m.get("content", "")).strip(),
        }
        for m in messages
        if m.get("role") in {"user", "assistant"} and str(m.get("content", "")).strip()
    ]

    if not cleaned_messages:
        raise ValueError("At least one valid message is required")

    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=cleaned_messages,
    )

    chunks = []
    for block in response.content:
        text = getattr(block, "text", "")
        if text:
            chunks.append(text)
    return "".join(chunks).strip()


async def stream_prompt(prompt: str, system: str = "", model: str = "claude-opus-4-6"):
    """Yield text chunks for SSE streaming."""
    client = get_client()
    with client.messages.stream(
        model=model,
        max_tokens=2048,
        system=system or "You are a helpful AI assistant.",
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text
