# SARA AI handoff

This is the onboarding document for any AI assistant working in Project SARA. Read it before planning or editing.

## Product context

SARA is an experimental multimodal AI system integration project. The first milestone is a web-based adaptive interface for audio, interactive visualizations, and structured agent outputs, without a conventional chat-first workflow. The repository is at the initial foundation stage; do not assume unimplemented product behavior exists.

## Current architecture

- `apps/web`: React + TypeScript + Vite, independently started with `npm run dev:web` from the root.
- `apps/api`: FastAPI, independently started with Uvicorn; `GET /health` is the health probe.
- `packages/contracts`: reserved for versioned API/UI contracts. Add shared schemas here rather than coupling app internals.
- `.env.example`: local non-secret defaults. Real `.env` files are ignored.

## Working agreements

1. Inspect the relevant files and current Git status before editing; preserve unrelated user work.
2. Keep web and API runnable independently. Avoid introducing infrastructure, authentication, native integrations, or public deployment without a scoped issue.
3. Do not put credentials or personal data in source, examples, logs, or commits.
4. Prefer small, typed changes and accessible UI. Keep user-facing copy in Brazilian Portuguese unless the issue says otherwise.
5. Use the skill under `.agents/skills/` that matches the task. External Codex skills may be discovered from Codex's available skill catalog; project skills remain the portable source of truth. Verify upstream material before copying it into this repository.
6. Before handing work back, report changed files, commands actually run, results, and anything still unverified. Never claim a command passed if it was not run.

## Local commands

From the root: `npm install`, `npm run dev:web`, `npm run build`, `npm run lint`, `npm run typecheck`. For API: create/activate a venv under `apps/api`, install `apps/api/requirements.txt`, then run `uvicorn app.main:app --app-dir apps/api --reload --host 127.0.0.1 --port 8000`.

## Sprint 1 issue #1

Issue: https://github.com/dreyvinixz/Project-Sara/issues/1

Acceptance targets: local web startup with a landing page; local API startup with `/health` returning 200; no committed secrets; README with requirements and startup instructions; reproducible web build and API startup. Out of scope: public deployment, authentication, and native integrations.
