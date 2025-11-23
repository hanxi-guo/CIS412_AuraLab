# Backend Implementation Plan (Python, Local Disk: SQLite + File Storage)

Scope: lightweight Python backend that persists campaigns/posts in SQLite on disk and saves uploaded media to a local directory. AI analysis is out of scope here (see `ai-suggestions-implementation.md`).

## Tech Stack
- Runtime: Python 3.11+.
- Framework: FastAPI (ASGI, built-in Pydantic validation, minimal boilerplate).
- DB: SQLite (file-backed) via SQLModel or SQLAlchemy Core; use SQLModel for concise models + Pydantic schemas.
- Auth: none by default (can add an API key later if needed).
- File uploads: Starlette/FastAPI `UploadFile` streamed to disk under `storage/media/`.
- Server: uvicorn.

## Directory Layout (proposed)
```
backend/
  app/
    main.py           # FastAPI app, routes mounted
    config.py         # env, paths, limits
    deps.py           # DB session dependency
    models.py         # SQLModel tables
    schemas.py        # Pydantic request/response DTOs
    routes/
      campaigns.py
      posts.py
      media.py        # optional media upload endpoint
    services/
      campaigns.py
      posts.py
      storage.py      # media save/delete
    middleware/
      errors.py
  storage/
    aura.db           # SQLite file (created at runtime/migrate)
    media/            # uploaded files
```

## Configuration
- `DATABASE_URL=sqlite:///./storage/aura.db`
- `MEDIA_ROOT=storage/media`
- `PORT` default 4000
- Limits: caption 4000 chars, title 120, brand voice tags max 8, media max 5 per post, file size cap ~10MB each.

## Database Schema (SQLite, via SQLModel)
- `campaigns`: `id (uuid pk)`, `name`, `brief_overview`, `brief_target_audience`, `brief_guardrails`, timestamps.
- `campaign_brand_voice`: `id (uuid pk)`, `campaign_id fk`, `tag` (unique per campaign, store lowercase).
- `posts`: `id (uuid pk)`, `campaign_id fk`, `title`, `caption`, `platform`, `status`, `scheduled_at`, `published_at`, timestamps.
- `post_media`: `id (uuid pk)`, `post_id fk`, `url` (relative path), `type` (image/video), `width?`, `height?`, `size_bytes?`.
- Indexes: `posts.campaign_id`, `campaign_brand_voice.campaign_id+tag`, `post_media.post_id`.
- Cascades: deleting a campaign deletes posts and media rows; deleting a post deletes media. Storage layer removes files.

## API Surface (to implement)
- CRUD endpoints: per `core-crud-api-plan.md`.
- Media upload: accept multipart on `POST /api/campaigns/:id/posts` (files in `media[]`); optional `POST /api/media` helper if desired.
- Serve media via `app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")`.

## Request Flow (posts with media)
1. Client sends multipart `POST /api/campaigns/:campaignId/posts` with fields (`title`, `caption`, `platform`, `status`, `scheduled_at`) and `media[]` files.
2. Upload handler streams files to `MEDIA_ROOT/<campaignId>/<uuid>.<ext>` and collects metadata (size, mime).
3. Within a DB transaction, create the post and related `post_media` rows; on error, delete any saved files.

## Validation & Errors
- Use Pydantic schemas for request validation; enforce lengths and allowed enums (platform/status).
- Central error handler returns clean JSON (`detail`, `fields`) and maps file-size limits to `413`.

## Storage Management
- Ensure `MEDIA_ROOT` exists at startup; create campaign subfolders lazily.
- Filenames = UUID + original extension; sanitize names to avoid traversal.
- On deletes, remove referenced files; ignore missing files but log warnings.

## Testing & Tooling
- FastAPI `TestClient` with temporary SQLite (`sqlite:///:memory:`) for unit/integration tests.
- Use a temp dir for media during tests.
- Alembic migrations optional; for lightweight setups, create tables via SQLModel metadata at startup (can add Alembic later if schema churn increases).

## Incremental Delivery
1. Bootstrap FastAPI app with config, error handlers, DB session wiring.
2. Define SQLModel models + Pydantic schemas; create tables in SQLite file.
3. Implement campaign CRUD.
4. Implement post CRUD with multipart upload + disk storage.
5. Serve media statically and ensure cleanup on deletes.
6. Add tests for CRUD and upload flows using in-memory DB + temp media dir.
