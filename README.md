# Data Explorer

Data Explorer is a web app that lets non-technical business users analyze their own data. Load a CSV and the app analyzes it, summarizes it, and turns it into charts and dashboards. No SQL or code needed.

**Your data never leaves the browser.** Everything runs client-side: no uploads, no backend, no telemetry on user data.

## Features (planned)

- Load a CSV file from your computer and preview it (parsed in the browser with Papa Parse; clear errors for invalid files) — implemented
- Sort (click a column header), filter (global search and per-column filters) and paginate the data — implemented
- Basic statistics per column (counts, missing, unique, min/max/mean/median/std dev, dates, most frequent values), computed on the filtered rows — implemented
- Plain-language summaries
- Charts (bar, line, pie, scatter) built by choosing columns and a chart type, drawn with ECharts, from the filtered rows — implemented
- A dashboard of saved charts. Only the chart configuration is saved (in your browser, or as a JSON file you download), never your data — implemented

## Tech stack

- Vue 3 + TypeScript, built with Vite
- ECharts (via vue-echarts) for charts, loaded on demand
- Vitest + Vue Test Utils for tests
- ESLint for linting

The CSV parser is Papa Parse.

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

## Data handling notes

- Column types are detected automatically: numbers (dot decimal, no thousands separators), dates (ISO `YYYY-MM-DD`) and text. A column is numeric or a date when at least 90% of its non-empty values match.
- Other formats (for example `45,50` or `13/03/2025`) are treated as text for now.
- Standard deviation is the sample standard deviation (n - 1).

## Charts and saved configuration

- Chart types: bar, line, pie (up to 7 categories plus "Other") and scatter (sampled above 5,000 points).
- A saved chart contains only its type, title, column names and aggregation. Rows and cell values are never stored or exported; everything saved passes through a whitelist (`src/charts/chartConfig.ts`).
- Dashboards are kept in the browser's `localStorage`, per set of column names and types, and can be exported or loaded as a small JSON file. Loading adds charts and skips any that refer to columns the current file does not have.
