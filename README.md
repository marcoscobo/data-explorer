# Data Explorer

Data Explorer is a web app that lets non-technical business users analyze their own data. Load a CSV and the app analyzes it, summarizes it, and turns it into charts and dashboards. No SQL or code needed.

**Your data never leaves the browser.** Everything runs client-side: no uploads, no backend, no telemetry on user data.

## Features (planned)

- Load a CSV file from your computer and preview it (parsed in the browser with Papa Parse; clear errors for invalid files) — implemented
- Automatic analysis and profiling of the data
- Plain-language summaries
- Charts generated from the data
- Dashboards combining several charts

## Tech stack

- Vue 3 + TypeScript, built with Vite
- Vitest + Vue Test Utils for tests
- ESLint for linting

The chart library and CSV parser are not chosen yet; each will be decided in its own feature branch.

## Getting started

Requires Node 22 (see `.nvmrc`). A DevContainer is provided in `.devcontainer/`.

```bash
npm install
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the full test suite |
| `npm run lint` | Run ESLint |
| `npm run build` | Production build |

## Development workflow

- `main` is production. `develop` is integration.
- Every feature lives on a `feature/<name>` branch created from `develop` and is merged only after review.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- Continuous testing: every change comes with its tests. The full test suite, lint, and build must pass before merging.

See [CLAUDE.md](CLAUDE.md) for the full rules used by AI agents working on this repo.

## Status

Early stage. The project skeleton is in place; no features yet.

## Deployment

Prepared for Vercel: the build outputs to `dist/` and serverless functions live in `/api`. Functions must never receive user data.
