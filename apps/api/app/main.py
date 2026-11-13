import logging
from copy import deepcopy
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.orchestrator import DemoSceneProvider, SceneProvider, load_scene
from app.scene_validation import validate_scene_document
from app.session_store import SessionStore

logger = logging.getLogger("sara.api")
app = FastAPI(title="SARA API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

sessions = SessionStore()
provider: SceneProvider = DemoSceneProvider()


class IntentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    intent: str = Field(min_length=1, max_length=2000)


def error_response(request: Request, status: int, code: str, message: str) -> JSONResponse:
    correlation_id = request.state.correlation_id
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "correlationId": correlation_id}})


@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    request.state.correlation_id = str(uuid4())
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = request.state.correlation_id
    return response


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return error_response(request, 404, "not_found", "Recurso não encontrado.")
    return error_response(request, exc.status_code, "request_error", "Não foi possível processar a solicitação.")


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return error_response(request, 422, "invalid_request", "O corpo da solicitação é inválido.")


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception):
    logger.error("unhandled_error correlation_id=%s error_type=%s", request.state.correlation_id, type(exc).__name__)
    return error_response(request, 500, "internal_error", "Ocorreu um erro interno.")


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "sara-api"}


@app.post("/sessions", status_code=201, tags=["sessions"])
def create_session() -> dict:
    session = sessions.create(str(uuid4()))
    return {"sessionId": session.id, "revision": session.revision, "state": "idle"}


@app.get("/sessions/{session_id}", tags=["sessions"])
def get_session(session_id: str):
    session = sessions.get(session_id)
    if session is None:
        return error_response_for_missing_session(session_id)
    return {"sessionId": session.id, "revision": session.revision, "state": "presenting" if session.scene else "idle", "scene": deepcopy(session.scene)}


def error_response_for_missing_session(session_id: str):
    raise HTTPException(status_code=404, detail="session not found")


@app.get("/sessions/{session_id}/result", tags=["sessions"])
def get_session_result(session_id: str):
    session = sessions.get(session_id)
    if session is None:
        error_response_for_missing_session(session_id)
    if session.scene is None:
        raise HTTPException(status_code=404, detail="result not found")
    return deepcopy(session.scene)


@app.post("/sessions/{session_id}/intents", tags=["sessions"])
def submit_intent(session_id: str, request: IntentRequest, http_request: Request):
    session = sessions.get(session_id)
    if session is None:
        error_response_for_missing_session(session_id)
    fixture_path = provider.scene_for(request.intent.strip())
    if fixture_path is None:
        return error_response(http_request, 422, "unsupported_intent", "Ainda não há uma demonstração para essa intenção.")

    try:
        scene = load_scene(fixture_path)
        scene["sessionId"] = session.id
        scene["revision"] = session.revision + 1
        validation_errors = validate_scene_document(scene)
        if validation_errors:
            raise ValueError("fixture failed SceneDocument validation")
    except (OSError, ValueError, TypeError):
        logger.error("scene_generation_failed correlation_id=%s", http_request.state.correlation_id)
        return error_response(http_request, 500, "scene_generation_failed", "Não foi possível preparar a cena demonstrativa.")

    session.revision += 1
    session.scene = scene
    session.last_intent = request.intent.strip()
    logger.info("scene_presented correlation_id=%s session_id=%s revision=%s", http_request.state.correlation_id, session.id, session.revision)
    return {"sessionId": session.id, "revision": session.revision, "scene": deepcopy(scene)}
