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

The API also exposes `POST /sessions`, `POST /sessions/{id}/intents`, `POST /sessions/{id}/actions`, `GET /sessions/{id}`, and `GET /sessions/{id}/result`. The initial provider routes market and neural-network demonstration intents to offline fixtures; unsupported intents return a structured error. The web app validates and renders the scenes and sends typed interactions back to the API.

Run API tests from the repository root with:

```bash
python -m unittest discover -s apps/api -p "test_*.py"
```

## CI, tests and permissions

Pull requests, pushes to `main` and manual workflow dispatch run [the CI pipeline](.github/workflows/ci.yml). Checks include Node 22 install from `package-lock.json`, web lint/typecheck/build, an offline web smoke test, JS scene-schema tests, Python 3.12 tests/lint, changed-file formatting, npm high-severity audit, and a tracked-file credential guard. PRs can run GitHub Dependency Review after enabling the repository Dependency Graph and setting the repository variable `DEPENDENCY_REVIEW_ENABLED=true`; otherwise that job is skipped because the service is currently unavailable. Dependabot checks npm, pip and GitHub Actions weekly.

Run the same checks locally from the repository root (Node 22, Python 3.12 or newer):

```bash
npm ci
npm run lint
npm run typecheck
npm --workspace @sara/contracts test
npm run build
npm run test:web
npm audit --audit-level=high
python -m pip install -r apps/api/requirements.txt "ruff>=0.14,<1"
ruff check apps/api scripts --select E4,E7,E9,F
python -m unittest discover -s apps/api -p "test_*.py" -v
python scripts/scan_secrets.py --self-test
python scripts/scan_secrets.py
python scripts/check_changed_format.py web
python scripts/check_changed_format.py python
```

Format checks only inspect source files touched since the common ancestor of this branch and its base. Pre-existing Sprint 1 formatting debt is not automatically rewritten; any newly touched code is checked. For new branches, a parent commit is used when `CI_BASE_SHA` is absent.

**Prototype permission policy:** The web app has no operating-system or other-app access. Microphone access must be explicitly initiated by the user when the voice feature is implemented; it must never listen in the background by default. The API uses temporary in-process sessions and offline fixtures, with no secret/API key required. External links are untrusted, HTTPS-only and require an explicit user click. Scene text is untrusted content, not code; the renderer must use text nodes, never `innerHTML`, `eval` or arbitrary scripts. Do not commit `.env`, credentials, tokens or real personal data. `.env.example` contains local placeholders only.

**Security scope:** The credential guard detects common signatures in tracked files but is not a comprehensive security audit; rotate any secret that was ever committed. Dependency Review is opt-in because the GitHub dependency graph is currently not enabled on this repository; enable it before setting `DEPENDENCY_REVIEW_ENABLED=true`. Ruff starts with the Python E4/E7/E9/F baseline; extended style rules for legacy code remain a separate cleanup. Only high/critical npm findings fail `npm audit`; moderate advisories still need review. A green pipeline is a baseline, not a production security certification.

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

## Navegador e recursos de voz

O ditado e a leitura em voz alta usam as APIs de fala disponibilizadas pelo navegador, sem chave de API e sem gravar ou enviar arquivos de áudio pela aplicação. O microfone só é iniciado pelo botão **Falar**; **Parar microfone** encerra a captura. A transcrição reconhecida segue como intenção da sessão para a API. O botão **Ouvir explicação** lê o texto da cena e permite interrupção. Se o navegador não oferecer ditado ou negar acesso, o campo de texto continua disponível. O processamento do reconhecimento de fala pode variar conforme navegador e fornecedor; consulte as configurações e a política de privacidade do navegador.
