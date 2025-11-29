"""
Quick smoke test for the AI analysis draft endpoint.

Usage:
    python test_ai_backend.py

Environment variables:
    API_BASE (default: http://localhost:8000/api)

The backend server must be running. If OPENAI_API_KEY is set on the server,
this will hit the live OpenAI-backed path; otherwise it will return the mock.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


API_BASE = os.getenv("API_BASE", "http://localhost:8000/api")
URL = f"{API_BASE.rstrip('/')}/analysis/draft"

PAYLOAD = {
    "title": "Flash Sale Teaser",
    "caption": "Don't miss it!!! Limited time. Save big on outerwear today.",
    "platform": "instagram",
    "campaign_context": {
        "overview": "Seasonal push for winter outerwear.",
        "target_audience": "Urban commuters 25-40 who value warm, sustainable gear.",
        "brand_voice": ["warm", "practical", "confident"],
        "guardrails": "Avoid overclaiming discounts; be clear about timing.",
    },
}


def main() -> int:
    data = json.dumps(PAYLOAD).encode("utf-8")
    req = urllib.request.Request(
        URL, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            print(f"Status: {resp.status}")
            try:
                parsed = json.loads(body)
                print(json.dumps(parsed, indent=2))
            except json.JSONDecodeError:
                print("Raw response:")
                print(body)
            return 0
    except urllib.error.HTTPError as err:
        print(f"HTTP error: {err.code} {err.reason}", file=sys.stderr)
        try:
            detail = err.read().decode("utf-8")
            print(detail, file=sys.stderr)
        except Exception:
            pass
        return 1
    except Exception as err:  # pragma: no cover - simple smoke script
        print(f"Request failed: {err}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
