import unittest
from uuid import UUID

from starlette.testclient import TestClient
from unittest.mock import patch

from app.main import app, sessions
from app.scene_validation import validate_scene_document, validate_user_action


class SessionApiTests(unittest.TestCase):
    def setUp(self):
        sessions._sessions.clear()
        self.client = TestClient(app)

    def test_demo_intents_return_valid_scenes_and_correlation_id(self):
        for intent, expected_component in (("Quero ver o mercado", "time_series"), ("Explique uma rede neural", "scene_3d")):
            session = self.client.post("/sessions").json()
            response = self.client.post(f"/sessions/{session['sessionId']}/intents", json={"intent": intent})
            self.assertEqual(response.status_code, 200)
            UUID(response.headers["X-Correlation-ID"])
            scene = response.json()["scene"]
            self.assertEqual(scene["sessionId"], session["sessionId"])
            self.assertEqual(scene["revision"], 0)
            self.assertTrue(any(component["type"] == expected_component for component in scene["components"]))
            self.assertEqual(validate_scene_document(scene), [])

    def test_sessions_do_not_share_state_and_revisions_are_isolated(self):
        first = self.client.post("/sessions").json()["sessionId"]
        second = self.client.post("/sessions").json()["sessionId"]
        self.client.post(f"/sessions/{first}/intents", json={"intent": "mercado"})
        self.client.post(f"/sessions/{first}/intents", json={"intent": "rede neural"})
        self.assertEqual(self.client.get(f"/sessions/{first}").json()["revision"], 1)
        self.assertEqual(self.client.get(f"/sessions/{second}").json()["revision"], -1)
        self.assertIsNone(self.client.get(f"/sessions/{second}").json()["scene"])

    def test_user_action_is_checked_against_session_revision_and_target(self):
        session_id = self.client.post("/sessions").json()["sessionId"]
        scene = self.client.post(f"/sessions/{session_id}/intents", json={"intent": "rede neural"}).json()["scene"]
        valid = {"schemaVersion": "0.0", "type": "user_action", "sessionId": session_id, "sceneRevision": 0, "actionId": "adjust_network", "componentId": "network", "value": 0.7}
        self.assertEqual(validate_user_action(valid, scene), [])
        self.assertTrue(validate_user_action({**valid, "sceneRevision": 9}, scene))
        self.assertTrue(validate_user_action({**valid, "componentId": "lesson"}, scene))

        market_id = self.client.post("/sessions").json()["sessionId"]
        market_scene = self.client.post(f"/sessions/{market_id}/intents", json={"intent": "mercado"}).json()["scene"]
        navigate = {"schemaVersion": "0.0", "type": "user_action", "sessionId": market_id, "sceneRevision": 0, "actionId": "open_b3", "componentId": "index"}
        self.assertEqual(validate_user_action(navigate, market_scene), [])

    def test_verified_datasets_require_provenance(self):
        session_id = self.client.post("/sessions").json()["sessionId"]
        scene = self.client.post(f"/sessions/{session_id}/intents", json={"intent": "mercado"}).json()["scene"]
        series = next(component for component in scene["components"] if component["type"] == "time_series")
        series["dataStatus"] = "verified"
        self.assertTrue(validate_scene_document(scene))
        series.update({"source": "B3", "referenceId": "b3_portal"})
        self.assertEqual(validate_scene_document(scene), [])

    def test_invalid_and_unsupported_requests_return_safe_correlated_errors(self):
        missing = self.client.get("/sessions/not-a-session")
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.json()["error"]["code"], "not_found")
        session_id = self.client.post("/sessions").json()["sessionId"]
        invalid = self.client.post(f"/sessions/{session_id}/intents", json={"intent": "secret intent phrase", "extra": "must not echo"})
        self.assertEqual(invalid.status_code, 422)
        self.assertNotIn("secret intent phrase", invalid.text)
        unsupported = self.client.post(f"/sessions/{session_id}/intents", json={"intent": "conte uma piada"})
        self.assertEqual(unsupported.status_code, 422)
        self.assertEqual(unsupported.json()["error"]["code"], "unsupported_intent")
        self.assertEqual(unsupported.headers["X-Correlation-ID"], unsupported.json()["error"]["correlationId"])

    def test_unexpected_provider_failure_hides_exception_details(self):
        session_id = self.client.post("/sessions").json()["sessionId"]
        with self.assertLogs("sara.api", level="ERROR") as captured:
            with patch("app.main.provider") as failing_provider:
                failing_provider.scene_for.side_effect = RuntimeError("private secret payload")
                response = TestClient(app, raise_server_exceptions=False).post(
                    f"/sessions/{session_id}/intents", json={"intent": "mercado"}
                )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["error"]["code"], "internal_error")
        self.assertNotIn("private secret payload", response.text)
        self.assertNotIn("Traceback", response.text)
        self.assertNotIn("private secret payload", "\n".join(captured.output))

    def test_retrieves_latest_result(self):
        session_id = self.client.post("/sessions").json()["sessionId"]
        self.client.post(f"/sessions/{session_id}/intents", json={"intent": "market overview"})
        result = self.client.get(f"/sessions/{session_id}/result")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["sessionId"], session_id)


if __name__ == "__main__":
    unittest.main()
