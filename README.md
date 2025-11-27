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

## Backend (CRUD API)
- Install Python deps:
  ```bash
  cd backend
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  ```
- Run the server (defaults to port 8000):
  ```bash
  cd backend
  python3 -m uvicorn app.main:app --reload --port 8000
  ```
- Media is stored under `backend/storage/media`, SQLite DB at `backend/storage/aura.db`.
