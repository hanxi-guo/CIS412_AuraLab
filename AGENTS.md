# Repository Guidelines

## Project Structure & Modules
- Root scripts and configs: `package.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.cjs`, `eslint.config.js`.
- App entry: `src/main.tsx`; top-level layout and logic: `src/App.tsx`.
- Reusable UI: `src/components/` (e.g., `Sidebar.tsx`, `PostEditorModal.tsx`, `NewCampaignModal.tsx`).
- Styling: Tailwind via `src/index.css`; legacy Vite starter styles in `src/App.css` (minimize new usage).
- Assets: `public/` and `src/assets/`. Docs live in `docs/` (e.g., `docs/sentiment-api.md`).

## Build, Test, and Development Commands
- Install deps: `npm ci` (preferred for reproducibility).
- Dev server: `npm run dev` (Vite; opens on port 5173 by default).
- Lint: `npm run lint` (eslint over the repo).
- Build: `npm run build` (TypeScript project refs + Vite production bundle).

## Coding Style & Naming Conventions
- Language: TypeScript + React; favor functional components and hooks.
- Indentation: 2 spaces; keep lines concise and readable.
- Styling: Tailwind classes; align with theme tokens in `src/config.ts` (`THEME` colors). Avoid inline hex values when a theme token exists.
- State: Prefer explicit state setters; avoid setState loops in effects unless guarded.
- Naming: Components in PascalCase (`Sidebar.tsx`), functions in camelCase, constants in SCREAMING_SNAKE_CASE.

## Testing Guidelines
- No formal test suite in repo yet. If adding tests, colocate with code using `*.test.ts[x]` and wire a test runner (e.g., Vitest) into `package.json`.
- At minimum, run `npm run lint` before submitting changes.

## Commit & Pull Request Guidelines
- Commits: concise, action-oriented subjects (e.g., `Fix highlight overflow`, `Add sentiment API doc`). Scope prefixes are optional but welcome.
- Pull Requests: include summary of changes, testing done (`npm run lint` / manual checks), and screenshots or short clips for UI updates.
- Link issues or tasks when applicable and call out any follow-up work or known gaps.

## Security & Configuration Tips
- Keep secrets out of the repo; use environment variables (e.g., `OPENAI_API_KEY`) on the server only.
- Respect lint rules; fix or annotate violations thoughtfully rather than disabling globally.
- When touching docs, keep technical accuracy with current API sketches in `docs/`.
