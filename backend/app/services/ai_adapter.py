"""Mock AI adapter for analysis results."""
# pylint: disable=missing-module-docstring,missing-function-docstring,missing-class-docstring
from typing import Any, Dict, List


def generate_feedback(snapshot: dict) -> Dict[str, Any]:
    """Return deterministic mock analysis data based on caption length."""
    caption: str = snapshot.get("caption", "") or ""
    length = len(caption)
    severity = "major" if length % 2 == 0 else "minor"
    return {
        "model": "mock-v1",
        "prompt_version": "1",
        "spans": [
            {
                "severity": severity,
                "message": "CTA is vague; focus on the benefit.",
                "text": caption[: max(length // 2, 1)] if caption else "",
                "suggestions": [
                    {
                        "text": "Preview the new fall drop designed for weekend trips.",
                        "rationale": "Names the drop and use-case.",
                        "confidence": 0.62,
                        "style": "more concrete",
                    }
                ],
            }
        ],
    }
