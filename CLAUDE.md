# CLAUDE.md

Guidance for AI agents working on Data Explorer.

## Project

Data Explorer is a web app for non-technical business users to analyze their own data. They load a CSV; the app analyzes it, summarizes it, and turns it into charts and dashboards. No SQL or code.

### Hard constraints

- **Data never leaves the browser.** No uploads, no backend, no network calls or telemetry that include user data.
- **Audience is non-technical.** UI text avoids jargon; no feature may require SQL or code from the user.

## Stack and commands

React + TypeScript + Vite; Vitest + Testing Library; ESLint. The project is not scaffolded yet, so the commands below apply once it is. The chart library and CSV parser are undecided: ask before choosing.

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Git workflow

- `main` is production. `develop` is integration.
- Every feature goes on a `feature/<name>` branch created from `develop`, and is merged only after review.
- Never commit directly to `main` or `develop`.
- Do not merge, push, or force-push without explicit user approval.

## Commits

Conventional Commits, types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

```
feat: add CSV loader
test: cover empty-file case in CSV loader
docs: update README getting started
```

## Continuous testing

- Every change comes with its tests.
- The full test suite, lint, and build must all pass before merging.
- Never report success with skipped or unverified checks; state what was not run.

## Working rules

- Work in small, self-contained, independently revertible steps; show each and stop for review.
- For non-trivial or multi-step work, present a short plan ("step -> how checked") and agreed "done" criteria before editing files.
- On an unspecified design decision, ask or propose and wait for confirmation.
- Keep to the minimum needed for the request: no speculative features.
- Never invent facts, versions, or capabilities: verify, or mark as an assumption.
- No credentials, tokens, or keys in code, docs, or output.
- Use only synthetic data in tests, fixtures, and examples; never real personal data.
- Before adding third-party code or dependencies, check license compatibility and flag copyleft.
- Never delete or deploy anything irreversible without explicit approval.
