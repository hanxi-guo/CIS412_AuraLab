# AI Feedback Schema & API Plan

## Context
- The Post Editor currently fakes feedback: it splits the caption into sentences, randomly marks them as `minor` or `major`, underlines them, and shows a modal with canned suggestions when a span is clicked.
- Goal: move span generation and feedback to a backend AI agent so the UI keeps the same underline-and-overlay pattern but uses real analysis tied to campaign context.

## Data Model (proposed)
- `campaign` (existing concept): `id`, `name`, `brief.overview`, `brief.target_audience`, `brief.brand_voice[]`, `brief.guardrails`.
- `post`: `id` (uuid), `campaign_id`, `title`, `caption`, `media[]` (urls or storage ids), `platform` (enum), `status` (draft/published), timestamps.
- `post_analysis`: `id` (uuid), `post_id`, `status` (pending/running/complete/failed), `source` (ai/human), `model`, `prompt_version`, `input_snapshot` (caption, title, platform, brand voice, guardrails, target audience), timestamps, `error`.
- `analysis_span`: `id` (uuid), `analysis_id`, `text` (the exact span to highlight), `severity` (minor/major/blocker), `message` (short rationale), `suggestion_ids[]`. If multiple identical spans exist, default to the first occurrence not already used by a prior span (client-side selection; server just returns the text).
- `suggestion`: `id` (uuid), `span_id`, `text` (replacement), `rationale`, `confidence` (0-1), optional `style` (short tag like “friendlier”, “more concise”).
- Notes:
  - Offsets allow the frontend to render wavy underlines over arbitrary spans (not just sentence boundaries).
  - Store the `input_snapshot` so the analysis can be audited even if the post later changes.
  - Keep `severity` compatible with existing UI colors (`minor` → amber, `major`/`blocker` → red).

## API Endpoints (REST)
- **Core for text feedback**
- `POST /api/posts/:id/analysis` — trigger AI analysis for the current caption.
  - Request: `{ title, caption, platform, campaign_context: { brand_voice[], guardrails, target_audience, overview }, media: [{id,url,type}], regenerate?: boolean }`.
  - Response (async-first): `{ analysis_id, status: "pending"|"running" }`.
- `GET /api/posts/:id/analysis/:analysisId` — poll for status/results.
  - Complete response shape:
    ```json
    {
      "analysis_id": "uuid",
      "status": "complete",
      "spans": [
        {
          "span_id": "uuid",
          "text": "You won't believe our new drop!",
          "severity": "major",
          "message": "CTA is vague; focus on the benefit.",
          "suggestions": [
            {
              "suggestion_id": "uuid",
              "text": "Preview the new fall drop designed for weekend trips.",
              "rationale": "Names the drop and the use-case.",
              "confidence": 0.62,
              "style": "more concrete"
            }
          ]
        }
      ]
    }
    ```
- `GET /api/posts/:id/analysis/latest` — convenience to grab the most recent complete analysis.
- `POST /api/analysis/draft` — optional endpoint to analyze unsaved text (same payload as `/posts/:id/analysis` but returns results without persisting `post`).

- **Out of scope here**: campaign/post CRUD is documented separately in `docs/core-crud-api-plan.md`.

## Frontend Integration Notes
- Replace the random client-side analysis with a call to `POST /api/posts/:id/analysis`, then poll `GET .../analysis/:analysisId` until complete.
- The editor can map `severity` to the existing underline colors; use `start_offset`/`end_offset` to wrap spans and open the overlay populated from `spans[].message` and `spans[].suggestions`.
- When a suggestion is applied in the UI, the client should update the caption locally and optionally `PUT /api/posts/:id` followed by a fresh analysis trigger.
- Preserve `analysis_id` in state so the overlay reflects the same version the underlines came from; discard spans if the caption changes locally before the analysis returns.
