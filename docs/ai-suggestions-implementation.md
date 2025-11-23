# AI Text Suggestions Backend Implementation

Purpose: implement the AI-powered span highlighting and rewrite suggestions described in `ai-feedback-api-plan.md` using the Python/FastAPI + SQLite backend outlined in `backend-implementation-plan.md`. No auth; local-only.

## Components
- **Routes** (`routes/analysis.py`):
  - `POST /api/posts/:id/analysis` — enqueue analysis job.
  - `GET /api/posts/:id/analysis/:analysis_id` — poll job status/results.
  - `GET /api/posts/:id/analysis/latest` — convenience fetch for latest complete analysis.
- **Service** (`services/analysis.py`):
  - `enqueue_analysis(post_id, regenerate=False)` — create `post_analysis` row with `status="pending"` and push job to queue.
  - `run_job(analysis_id)` — load snapshot, call AI adapter, persist spans/suggestions, mark `status="complete"` or `failed`.
- **Queue** (`services/queue.py`):
  - Simple in-process queue (list + worker thread or asyncio task). Accepts callables with args; retries minimal (e.g., 1 retry) to keep it lightweight.
- **AI Adapter** (`services/ai_adapter.py`):
  - Interface: `generate_feedback(snapshot) -> AnalysisResult`.
  - Start with a deterministic mock (fixed spans/suggestions) for offline use. Later swap to provider (e.g., OpenAI) via env-configured client.

## Data Handling
- **Snapshot**: read `posts` + `campaigns` + `campaign_brand_voice` + `post_media`. Store a JSON snapshot in `post_analysis.input_snapshot` (title, caption, platform, brand_voice[], guardrails, target_audience, overview, media[]).
- **Offsets**: spans returned by adapter must include `start_offset`/`end_offset` against the raw caption string (0-based, end-exclusive). Validate bounds before insert.
- **Persistence**:
  - `post_analysis`: `status` (`pending|running|complete|failed`), `error` (nullable), `model`, `prompt_version`, timestamps.
  - `analysis_spans`: `analysis_id`, `start_offset`, `end_offset`, `text`, `severity`, `category`, `message`.
  - `analysis_suggestions`: `span_id`, `text`, `rationale`, `confidence`, `style`.
  - Use a transaction when writing spans/suggestions to keep referential integrity.
- **Staleness**: if `posts.updated_at` changes after enqueue, allow job to complete but include `post_updated_after_snapshot` boolean in the poll response so the client can ignore stale results.

## Request Flow
1. **Trigger** (`POST /api/posts/:id/analysis`):
   - Validate `post_id` exists; load snapshot.
   - Insert `post_analysis` row (`status="pending"`); enqueue job; return `{ analysis_id, status: "pending" }`.
2. **Worker**:
   - Mark analysis `running`.
   - Call AI adapter; on success, upsert spans/suggestions + set `status="complete"`.
   - On error, set `status="failed"` and `error` message.
3. **Poll** (`GET /api/posts/:id/analysis/:analysis_id`):
   - Return `status`, `summary` (optional scores), `spans` with suggestions, and `post_updated_after_snapshot`.

## AI Adapter (mock baseline)
- Input: snapshot dict.
- Output example:
  ```json
  {
    "summary": { "overall_score": 0.72, "tone_match": 0.8, "risks": ["unclear CTA"] },
    "spans": [
      {
        "start_offset": 0,
        "end_offset": 42,
        "severity": "major",
        "category": "clarity",
        "message": "CTA is vague; focus on the benefit.",
        "suggestions": [
          {
            "text": "Preview the new fall drop designed for weekend trips.",
            "rationale": "Names the drop and use-case.",
            "confidence": 0.62,
            "style": "more concrete"
          }
        ]
      }
    ],
    "model": "mock-v1",
    "prompt_version": "1"
  }
  ```

## Validation & Limits
- Enforce span bounds within caption length.
- Required fields per `ai-feedback-api-plan.md`: `severity` in {minor, major, blocker}, `category` in {tone, clarity, compliance, other}.
- File size/limits already handled by CRUD layer; analysis endpoints only read post/media metadata.

## Testing
- Unit: mock adapter → expect stored spans/suggestions match output; ensure out-of-bounds spans are rejected.
- Integration: hit `POST /api/posts/:id/analysis`, then poll until `complete`; verify DB rows and response shape.
- Concurrency: enqueue multiple jobs; ensure queue processes sequentially without dropping tasks.
