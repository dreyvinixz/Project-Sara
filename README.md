# Project SARA

SARA is an experimental multimodal AI system. Sprint 1 establishes an independent web frontend and API as the foundation for audio, interactive visualizations, and structured agent outputs.

## Requirements

- Node.js 20 or newer and npm 10 or newer
- Python 3.11 or newer

## Local setup

Copy `.env.example` to `.env` if you need to override local defaults. The example contains no secrets; never commit real credentials.

Web app (from the repository root):

```bash
npm install
npm run dev:web
npm run build
```

The Vite development server is available at `http://127.0.0.1:5173`.

API (in a second terminal, from the repository root):

```bash
python -m venv apps/api/.venv
# Windows PowerShell: .\apps\api\.venv\Scripts\Activate.ps1
# macOS/Linux: source apps/api/.venv/bin/activate
python -m pip install -r apps/api/requirements.txt
uvicorn app.main:app --app-dir apps/api --reload --host 127.0.0.1 --port 8000
```

Check the API at `http://127.0.0.1:8000/health`; interactive API docs are at `/docs`.

The API also exposes `POST /sessions`, `POST /sessions/{id}/intents`, `GET /sessions/{id}`, and `GET /sessions/{id}/result`. The initial provider routes market and neural-network demonstration intents to offline fixtures; unsupported intents return a structured error.

Run API tests from the repository root with:

```bash
python -m unittest discover -s apps/api -p "test_*.py"
```

## Repository map

- `apps/web`: React, TypeScript, and Vite user interface.
- `apps/api`: FastAPI service and health endpoint.
- `packages/contracts`: reserved for versioned frontend/API contracts.
- `.agents`: project guidance, reusable skills, and AI handoff.

## Contribution conventions

- Use focused branches such as `feature/<short-name>` or `fix/<short-name>`.
- Keep frontend and API independently runnable; share only versioned contracts through `packages/contracts`.
- Open pull requests against `main`, describe behavior and validation, and keep secrets out of commits.
- Run `npm run build` for web changes. For API changes, start Uvicorn and check `/health`.

See [`.agents/AI_HANDOFF.md`](.agents/AI_HANDOFF.md) for context intended for any coding assistant.
