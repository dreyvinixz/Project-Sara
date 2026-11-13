"""Security regression tests for declarative, non-executable scenes."""

import json
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

from starlette.testclient import TestClient

from app.main import app, sessions
from app.scene_validation import validate_scene_document, validate_user_action

FIXTURES = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "fixtures"


def fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class SceneSecurityTests(unittest.TestCase):
    def setUp(self):
        sessions._sessions.clear()
        self.market = fixture("market-overview.json")

    def test_both_fixtures_are_valid(self):
        self.assertEqual(validate_scene_document(self.market), [])
        neural = fixture("neural-network-lesson.json")
        self.assertEqual(validate_scene_document(neural), [])

    def test_rejects_unapproved_components_and_executable_fields(self):
        scene = deepcopy(self.market)
        scene["components"][0]["onClick"] = "run arbitrary JS"
        self.assertTrue(validate_scene_document(scene))
        scene["components"][0].pop("onClick")
        scene["components"][0]["type"] = "script"
        self.assertTrue(validate_scene_document(scene))

    def test_html_like_content_is_not_executed_by_server_validator(self):
        scene = deepcopy(self.market)
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / "must-not-be-created"
            scene["components"][0]["content"] = (
                f"<script>write_file({marker!s})</script>"
            )
            self.assertEqual(validate_scene_document(scene), [])
            self.assertFalse(marker.exists())

    def test_invalid_reference_and_session_action_are_rejected(self):
        scene = deepcopy(self.market)
        scene["references"][0]["url"] = "javascript:alert(1)"
        self.assertTrue(validate_scene_document(scene))
        action = {
            "schemaVersion": "0.0",
            "type": "user_action",
            "sessionId": "wrong_session",
            "sceneRevision": 0,
            "actionId": "select_market_event",
            "componentId": "index",
        }
        self.assertTrue(validate_user_action(action, self.market))

    def test_api_rejects_invalid_scene_without_persisting_it(self):
        client = TestClient(app)
        session_id = client.post("/sessions").json()["sessionId"]
        invalid = deepcopy(self.market)
        invalid["components"][0]["onClick"] = "bad"
        with patch("app.main.load_scene", return_value=invalid):
            with self.assertLogs("sara.api", level="ERROR"):
                result = client.post(
                    f"/sessions/{session_id}/intents",
                    json={"intent": "mercado"},
                )
        self.assertEqual(result.status_code, 500)
        self.assertEqual(
            result.json()["error"]["code"],
            "scene_generation_failed",
        )
        state = client.get(f"/sessions/{session_id}").json()
        self.assertEqual(state["revision"], -1)
        self.assertIsNone(state["scene"])


if __name__ == "__main__":
    unittest.main()
