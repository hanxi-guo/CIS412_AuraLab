# Plan: Replace Mock Text Analysis With Real AI Backend

## Goals
- Replace the deterministic mock (`generate_feedback`) with an OpenAI-backed adapter (MVP: only OpenAI, no other providers), keeping the current API surface stable for the frontend.
- Preserve span highlighting UX (minor = orange, major = red) and suggestion overlay, but return higher-quality comments and rewrites.
- Make the path to local/dev testing deterministic and safe.

## Current Behavior (baseline)
- `services/ai_adapter.py` splits the caption into sentences, alternates severities, and returns canned suggestions.
- Frontend maps span `text` to the caption by first-unused occurrence; no offsets are sent.
- Draft analysis endpoint (`POST /api/analysis/draft`) returns spans synchronously without persisting.

## Target Architecture
- **AI Adapter**: Implement OpenAI-backed generation behind `generate_feedback(snapshot)` (only OpenAI; mock fallback if no key).
  - Env settings: `OPENAI_API_KEY`, `OPENAI_MODEL` (use `gpt-5-mini`), `AI_TIMEOUT_SECONDS`.
  - Output shape: `{ model, prompt_version, spans: [{ text, severity, comment, suggestions[] }] }` (suggestions include text + optional rationale).
  - Keep a `mock` branch solely as an offline fallback; otherwise always call OpenAI.
- **Prompting**:
  - Inputs: title, caption, platform, campaign overview, target audience, brand voice tags, guardrails, media summary (filenames/types only).
  - Instructions: return 0–5 spans; severity must be `minor` or `major` (no `blocker`); pick the most actionable risks (tone, clarity, compliance, specificity); include rewrite suggestions that differ from the original text.
  - Response API call: `model: gpt-5-mini`, `response_format: {type: "json_object"}`, `max_output_tokens` (cap for cost/latency), optional `reasoning_effort: "minimal"` for speed; include `temperature` only if supported by the selected snapshot.
  - Determinism for tests: optional `AI_SEED` if the model supports it.
- **Offsets vs. text**:
  - Adapter computes `start`/`end` offsets server-side (to disambiguate repeats) and includes both offsets and `text` in the payload for compatibility.

## Implementation Steps
1) **Config + client**
   - Env vars: `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_TIMEOUT_SECONDS`.
   - Add `services/providers/openai_client.py` to wrap Responses/Chat Completions with timeout and retries (backoff, JSON mode via `response_format: json_object`).
2) **Adapter rewrite**
   - Update `generate_feedback(snapshot)` to:
     - Build a system+user prompt from snapshot fields.
     - Call OpenAI chat completions (JSON mode) and parse spans: `text`, `severity (minor|major)`, `comment`, `suggestions[{text, rationale?}]`, optional `category`.
     - Validate spans (non-empty text, ≤ caption length, severity in {minor, major}, suggestions differ from span text).
     - Return the normalized structure used by `services/analysis.py`.
   - Keep a mock fallback only when `OPENAI_API_KEY` is missing.
3) **Server-side offsets (preserve text)**
   - After receiving spans from OpenAI (which only return `text`), compute `start_offset`/`end_offset` on the server by matching the span text in the caption, skipping overlaps (same logic as the current frontend).
   - Persist offsets in `AnalysisSpan` (add nullable columns) and include them in API responses.
   - Keep `text` in the payload so the frontend remains compatible; frontend should consume offsets when present and may fall back to text matching only if offsets are null.
3) **Service hardening**
   - In `services/analysis.py`, surface adapter errors as `status="failed"` with `error` populated; do not crash the worker.
   - Set a per-job timeout in the queue worker to avoid hanging runs.
   - If offsets are present, store them in `AnalysisSpan` (add nullable columns `start_offset`, `end_offset`); keep text storage for backwards compatibility.
4) **API compatibility**
   - Maintain existing endpoints/payloads; extend response schema to include offsets.
   - Ensure `run_draft` calls the new adapter so draft and persisted paths match behavior.
5) **Testing**
   - Unit: adapter parsing/validation with mocked provider responses; ensure suggestions differ from the span text.
   - Integration: trigger `/api/analysis/draft` with `AI_PROVIDER=mock` to keep deterministic fixtures; assert span fields and severities.
   - Migration check: if adding offset columns, include Alembic migration (or SQLModel migration script) and backfill nulls.
6) **Operational notes**
   - Log prompt_version and model in `post_analysis` for auditability.
   - Redact user content in logs; only log high-level errors.
   - Add guardrails in prompt to avoid PII leaks or unsafe content in suggestions.

## Frontend Impact (later)
- Frontend should render spans using `start_offset`/`end_offset` when provided, falling back to text-based matching only when offsets are missing.
- Keep severity → color mapping unchanged.
