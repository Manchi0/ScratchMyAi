import os
from pathlib import Path

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
