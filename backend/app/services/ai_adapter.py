"""AI adapter for post analysis."""
# pylint: disable=missing-module-docstring,missing-function-docstring,missing-class-docstring
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List
from uuid import uuid4

from openai import OpenAIError

from .providers.openai_client import chat_json, get_client, OPENAI_MODEL

ANALYSIS_SCHEMA: Dict[str, Any] = {
    "name": "analysis_spans",
    "schema": {
        "type": "object",
        "properties": {
            "spans": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "text": {"type": "string"},
                        "severity": {"type": "string", "enum": ["minor", "major"]},
                        "comment": {"type": "string"},
                        "suggestions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "text": {"type": "string"},
                                    "rationale": {"type": "string"},
                                },
                                "required": ["id", "text", "rationale"],
                                "additionalProperties": False,
                            },
                            "default": [],
                        }
                    },
                    "required": ["id", "text", "severity", "comment", "suggestions"],
                    "additionalProperties": False,
                },
                "default": [],
            }
        },
        "required": ["spans"],
        "additionalProperties": False,
    },
    "strict": True,
}


def _find_sentences(text: str) -> List[str]:
    """Split text into sentences using simple punctuation rules."""
    pattern = r"(?<=[.!?])\s+|(?<=[.!?])$"
    sentences = re.split(pattern, text)
    return [s.strip() for s in sentences if s.strip()]


def _mock_feedback(snapshot: dict) -> Dict[str, Any]:
    """Deterministic mock for offline/dev use."""
    caption: str = snapshot.get("caption", "") or ""

    if not caption.strip():
        return {
            "model": "mock-v1",
            "prompt_version": "1",
            "spans": [],
        }

    sentences = _find_sentences(caption)
    spans: List[Dict[str, Any]] = []

    for i, sentence in enumerate(sentences):
        if len(sentence) < 10:
            continue

        severity = "minor" if i % 2 == 0 else "major"

        if len(spans) >= 2:
            break

        suggestion_text = f"Consider a sharper phrasing: {sentence[:50]}..."

        spans.append(
            {
                "severity": severity,
                "comment": "Consider making this more engaging."
                if severity == "minor"
                else "This could be more impactful.",
                "text": sentence,
                "suggestions": [
                    {
                        "text": suggestion_text,
                        "rationale": "A more concrete phrase increases engagement.",
                    }
                ],
            }
        )

    return {
        "model": "mock-v1",
        "prompt_version": "1",
        "spans": spans,
    }


def _build_messages(snapshot: dict) -> List[Dict[str, str]]:
    """Create chat messages for OpenAI JSON response."""
    caption = snapshot.get("caption", "") or ""
    title = snapshot.get("title") or ""
    platform = snapshot.get("platform") or ""
    campaign = snapshot.get("campaign") or {}
    brand_voice = ", ".join(campaign.get("brand_voice") or []) or "unspecified"
    guardrails = campaign.get("guardrails") or ""
    target_audience = campaign.get("target_audience") or ""
    overview = campaign.get("overview") or ""

    system = (
        "You are a concise social media copy editor.\n"
        "\n"
        "CONTEXT\n"
        f"- Campaign overview: {overview or 'N/A'}\n"
        f"- Target audience: {target_audience or 'N/A'}\n"
        f"- Brand voice tags: {brand_voice}\n"
        f"- Guardrails: {guardrails or 'N/A'}\n"
        f"- Platform: {platform or 'unspecified'}\n"
        "\n"
        "TASK\n"
        "Analyze the post title and caption and highlight up to 5 short spans that most need improvement.\n"
        "Focus on clarity, tone, compliance with guardrails, and specificity to the audience/offer.\n"
        "\n"
        "OUTPUT FORMAT\n"
        "- Respond with a single JSON object that conforms to the provided response schema. No prose or code fences.\n"
        "- Every suggestion.text MUST differ from span.text.\n"
        "\n"
        "FEW-SHOT EXAMPLES (for guidance only; do not repeat these in your answer)\n"
        'Input: {"title":"Winter Drop","caption":"Check out our new coats. They are nice and cozy."}\n'
        'Output: {"spans":[{"text":"They are nice and cozy.","severity":"minor","comment":"Be specific about benefits.","suggestions":[{"text":"They\'re lined with recycled fleece for sub-zero commutes.","rationale":"Names the benefit"}]}]}\n'
        'Input: {"title":"Flash Sale","caption":"Don\'t miss it!!! Limited time."}\n'
        'Output: {"spans":[{"text":"Don\'t miss it!!!","severity":"major","comment":"Hype without offer detail.","suggestions":[{"text":"Save 30% today only—automatically applied at checkout.","rationale":"Adds concrete offer"}]}]}'
    )

    user_payload = {"title": title, "caption": caption}

    return [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": "Input: "
            + json.dumps(user_payload, ensure_ascii=False, separators=(",", ":")),
        },
    ]


def _parse_ai_result(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize AI response dict to expected structure."""
    spans = []
    for span in raw.get("spans", []) or []:
        text = span.get("text", "").strip()
        if not text:
            continue
        severity = span.get("severity", "minor")
        if severity not in {"minor", "major"}:
            severity = "minor"
        suggestions = []
        for sug in span.get("suggestions", []) or []:
            sug_text = (sug.get("text") or "").strip()
            if not sug_text or sug_text == text:
                continue
            suggestions.append(
                {
                    "id": sug.get("id") or str(uuid4()),
                    "text": sug_text,
                    "rationale": sug.get("rationale"),
                }
            )
        spans.append(
            {
                "id": span.get("id") or str(uuid4()),
                "text": text,
                "severity": severity,
                "comment": span.get("comment") or span.get("message") or "",
                "suggestions": suggestions,
            }
        )
    return {
        "model": raw.get("model") or OPENAI_MODEL,
        "prompt_version": raw.get("prompt_version") or "gpt-5-mini-v1",
        "spans": spans,
    }


def generate_feedback(snapshot: dict) -> Dict[str, Any]:
    """Call OpenAI to produce spans and suggestions (no silent fallback)."""
    caption: str = snapshot.get("caption", "") or ""
    if not caption.strip():
        return {"model": OPENAI_MODEL, "prompt_version": "gpt-5-mini-v1", "spans": []}

    if not get_client():
        raise RuntimeError("OPENAI_API_KEY is not set; cannot run analysis")

    messages = _build_messages(snapshot)
    try:
        ai_json = chat_json(messages, schema=ANALYSIS_SCHEMA)
        return _parse_ai_result(ai_json)
    except OpenAIError as exc:
        raise RuntimeError(f"OpenAI call failed: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Failed to parse OpenAI response: {exc}") from exc
