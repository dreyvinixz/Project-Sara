"""In-memory session storage for the single-process Sprint 1 prototype."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Session:
    id: str
    revision: int = -1
    scene: dict[str, Any] | None = None
    last_intent: str | None = field(default=None, repr=False)


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def create(self, session_id: str) -> Session:
        session = Session(id=session_id)
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)
