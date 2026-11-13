"""Deterministic intent router behind a replaceable provider interface."""

import json
import re
from pathlib import Path
from typing import Protocol

FIXTURES = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "fixtures"


class SceneProvider(Protocol):
    def scene_for(self, intent: str) -> str | None: ...


class DemoSceneProvider:
    """Routes supported phrases to offline, non-live demonstration fixtures."""

    _routes = {
        "market_overview": re.compile(r"\b(mercado|market|ações|bolsa|cotação)\b", re.IGNORECASE),
        "neural_network_lesson": re.compile(r"\b(rede neural|neural network|neur[oô]nio|neurons?)\b", re.IGNORECASE),
    }

    def scene_for(self, intent: str) -> str | None:
        for fixture, pattern in self._routes.items():
            if pattern.search(intent):
                return str(FIXTURES / f"{fixture.replace('_', '-')}.json")
        return None


def load_scene(fixture_path: str) -> dict:
    with Path(fixture_path).open(encoding="utf-8") as file:
        return json.load(file)
