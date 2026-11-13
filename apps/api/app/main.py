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
from app.scene_validation import validate_scene_document, validate_user_action
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


class UserActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    schemaVersion: str = Field(alias="schemaVersion")
    type: str
    sessionId: str = Field(alias="sessionId")
    sceneRevision: int = Field(alias="sceneRevision")
    actionId: str = Field(alias="actionId")
    componentId: str = Field(alias="componentId")
    value: str | float | bool | None = None


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


@app.post("/sessions/{session_id}/actions", tags=["sessions"])
def submit_action(session_id: str, action_request: UserActionRequest, http_request: Request):
    session = sessions.get(session_id)
    if session is None:
        error_response_for_missing_session(session_id)
    if session.scene is None:
        return error_response(http_request, 409, "scene_not_ready", "Inicie uma intenção antes de interagir com a cena.")

    action = action_request.model_dump(by_alias=True, exclude_none=True)
    validation_errors = validate_user_action(action, session.scene)
    if validation_errors:
        return error_response(http_request, 422, "invalid_action", "A interação não corresponde à cena atual.")

    updated_scene = deepcopy(session.scene)
    definition = next(item for item in updated_scene["actions"] if item["id"] == action["actionId"])
    navigation = None
    if definition["type"] == "navigate":
        reference = next(item for item in updated_scene["references"] if item["id"] == definition["referenceId"])
        navigation = {"url": reference["url"], "title": reference["title"]}
    elif definition["type"] == "adjust":
        control = next((item for item in updated_scene["components"] if item["type"] == "control" and item["actionId"] == definition["id"]), None)
        value = action.get("value")
        if control is None or isinstance(value, bool) or not isinstance(value, (int, float)) or not control["min"] <= value <= control["max"]:
            return error_response(http_request, 422, "invalid_action_value", "O valor da interação está fora dos limites do controle.")
        target = next((item for item in updated_scene["components"] if item["id"] == definition["targetComponentId"]), None)
        if target is None or target["type"] != "scene_3d" or not target["weights"] or not target["weights"][0] or not target["weights"][0][0] or not -10 <= value <= 10:
            return error_response(http_request, 422, "unsupported_action_target", "Este controle não pode ajustar o componente solicitado.")
        target["weights"][0][0][0] = value
        control["value"] = value

    updated_scene["revision"] += 1
    validation_errors = validate_scene_document(updated_scene)
    if validation_errors:
        logger.error("scene_update_failed correlation_id=%s", http_request.state.correlation_id)
        return error_response(http_request, 500, "scene_update_failed", "Não foi possível atualizar a cena.")
    session.scene = updated_scene
    session.revision = updated_scene["revision"]
    logger.info("user_action_applied correlation_id=%s session_id=%s action_id=%s revision=%s", http_request.state.correlation_id, session.id, definition["id"], session.revision)
    response = {"sessionId": session.id, "revision": session.revision, "scene": deepcopy(updated_scene), "event": action}
    if navigation:
        response["navigation"] = navigation
    return response
