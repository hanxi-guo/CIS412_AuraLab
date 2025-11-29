# AuraLab Frontend

## Prerequisites
- Node.js 18+ and npm installed.

## Install
```bash
npm ci
```

## Run the dev server
```bash
npm run dev
```
Then open the URL printed in the terminal (usually http://localhost:5173).

## Run lint (recommended before committing)
```bash
npm run lint
```

## Lint
```bash
npm run lint
```

## Build for production
```bash
npm run build
```

## Backend (CRUD + AI analysis)
- Install Python deps:
  ```bash
  cd backend 
  python3 -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  ```
- Environment:
  - The backend auto-loads the nearest `.env` (repo root or `backend/.env`) via `python-dotenv`.
  - Copy and edit:
    ```bash
    cp .env.example .env   # from repo root, or backend/.env.example to backend/.env
    # set OPENAI_API_KEY=... (OPENAI_MODEL defaults to gpt-5-mini)
    # temperature is ignored for GPT-5 models; max tokens configured via AI_MAX_OUTPUT_TOKENS
    ```
- Run the server (defaults to port 8000):
  ```bash
  cd backend
  python3 -m uvicorn app.main:app --reload --port 8000
  ```
- Media is stored under `backend/storage/media`, SQLite DB at `backend/storage/aura.db`.
- AI analysis: requires `OPENAI_API_KEY`; otherwise the draft/analysis endpoints will error. Mock fallback is no longer automatic.
- Schema changes: none auto-run. If you hit schema errors, delete `backend/storage/aura.db` to recreate fresh tables with the current models.
