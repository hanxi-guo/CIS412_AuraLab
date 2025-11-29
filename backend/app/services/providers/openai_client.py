"""Thin OpenAI client wrapper with sane defaults for JSON responses."""
from __future__ import annotations

import os
from typing import Any, Dict, Optional

from openai import OpenAI, OpenAIError


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini")
AI_TIMEOUT = _float_env("AI_TIMEOUT_SECONDS", 15.0)
AI_MAX_OUTPUT_TOKENS = _int_env("AI_MAX_OUTPUT_TOKENS", 800)
AI_REASONING_EFFORT = os.getenv("AI_REASONING_EFFORT")

_client: Optional[OpenAI] = None


def get_client() -> Optional[OpenAI]:
    """Instantiate a singleton OpenAI client if a key is present."""
    global _client
    if not OPENAI_API_KEY:
        return None
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY, timeout=AI_TIMEOUT)
    return _client


def chat_json(messages: list[dict[str, Any]], schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Call OpenAI Chat Completions in JSON mode.

    Returns the parsed JSON object. Raises OpenAIError on API issues.
    """
    client = get_client()
    if client is None:
        raise RuntimeError("OPENAI_API_KEY is not set")

    response_format: Dict[str, Any] = {"type": "json_object"}
    if schema:
        response_format = {"type": "json_schema", "json_schema": schema}

    kwargs: Dict[str, Any] = dict(
        model=OPENAI_MODEL,
        messages=messages,
        response_format=response_format,
        max_completion_tokens=AI_MAX_OUTPUT_TOKENS,
    )
    if AI_REASONING_EFFORT:
        kwargs["reasoning_effort"] = AI_REASONING_EFFORT

    response = client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content if response.choices else None
    if not content:
        raise OpenAIError("Empty response", response=response)  # type: ignore[arg-type]
    import json  # local import to avoid overhead if unused

    return json.loads(content)
