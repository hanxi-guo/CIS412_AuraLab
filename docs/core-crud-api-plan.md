# Core CRUD API & Schemas

Scope: backend ownership of campaigns and posts so the frontend no longer keeps them only in memory. This doc is non-AI; analysis lives elsewhere.

## Schemas (canonical shapes)
- **Campaign**
  ```json
  {
    "id": "uuid",
    "name": "string",
    "brief": {
      "overview": "string",
      "target_audience": "string",
      "brand_voice": ["string"],
      "guardrails": "string"
    },
    "created_at": "iso-datetime",
    "updated_at": "iso-datetime"
  }
  ```
- **Post**
  ```json
  {
    "id": "uuid",
    "campaign_id": "uuid",
    "title": "string",
    "caption": "string",
    "media": [
      { "id": "uuid", "url": "/media/file.jpg", "type": "image" }
    ],
    "platform": "instagram|facebook|twitter|linkedin|tiktok|other",
    "status": "draft|scheduled|published",
    "scheduled_at": "iso-datetime|null",
    "published_at": "iso-datetime|null",
    "created_at": "iso-datetime",
    "updated_at": "iso-datetime"
  }
  ```
- **Media object**: `{ id: "uuid", url: "string", type: "image|video", width?: number, height?: number, size_bytes?: number }`

## Validation Notes
- Lengths: campaign.name ≤ 80; title ≤ 120; caption ≤ 4000; brief fields ≤ 2000; brand_voice tags ≤ 32 chars, max 8 per campaign.
- Trim strings; reject empty names.
- brand_voice unique per campaign (case-insensitive).
- media.url must be https or a server-served path; type in {image, video}.
- scheduled_at required only if status = scheduled.

## API Endpoints (REST)
### Campaigns
- `GET /api/campaigns`
  - Query: `search?` filter by name; `include=posts?` optional.
  - Response: `{ campaigns: Campaign[] }` (posts included when requested).
- `POST /api/campaigns`
  - Body: `{ name, brief: { overview?, target_audience?, brand_voice?, guardrails? } }`
  - Response: `Campaign`
- `GET /api/campaigns/:id`
  - Query: `include=posts?`
  - Response: `Campaign` (+ `posts: Post[]` when requested)
- `PUT /api/campaigns/:id`
  - Body: partial `{ name?, brief? }`
  - Response: updated `Campaign`
- `DELETE /api/campaigns/:id`
  - Response: `{ deleted: true }`

### Posts
- `GET /api/campaigns/:campaignId/posts`
  - Query: pagination `page?`, `page_size?`
  - Response: `{ posts: Post[], page, page_size, total }`
- `POST /api/campaigns/:campaignId/posts`
  - Body: `{ title?, caption?, media?, platform?, status?, scheduled_at? }`
  - Response: created `Post`
- `GET /api/posts/:id`
  - Response: `Post`
- `PUT /api/posts/:id`
  - Body: same shape as create (partial)
  - Response: updated `Post`
- `DELETE /api/posts/:id`
  - Response: `{ deleted: true }`

## Notes for Frontend Migration
- IDs become UUIDs (not numeric).
- Enforce tag limits client-side to mirror backend (max 8, 32 chars, unique).
- Optimistic updates ok; re-fetch after writes to sync server state.
- Campaign delete cascades to posts/media; surface that in UI confirms.
