"""Server-side validation for the canonical SceneDocument v0 schemas."""

import json
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from jsonschema import Draft202012Validator

CONTRACTS = Path(__file__).resolve().parents[3] / "packages" / "contracts"
with (CONTRACTS / "scene-document-v0.schema.json").open(encoding="utf-8") as file:
    SCENE_SCHEMA = json.load(file)
with (CONTRACTS / "user-action-v0.schema.json").open(encoding="utf-8") as file:
    ACTION_SCHEMA = json.load(file)

_scene_validator = Draft202012Validator(SCENE_SCHEMA)
_action_validator = Draft202012Validator(ACTION_SCHEMA)


def _unique(items: list[dict[str, Any]], key: str, path: str, errors: list[str]) -> None:
    values = [item[key] for item in items]
    if len(values) != len(set(values)):
        errors.append(f"{path}: identifiers must be unique")


def validate_scene_document(scene: Any) -> list[str]:
    errors = [f"{error.json_path}: invalid value" for error in _scene_validator.iter_errors(scene)]
    if errors or not isinstance(scene, dict):
        return errors or ["$: expected object"]

    components = scene["components"]
    actions = scene["actions"]
    references = scene["references"]
    component_ids = {component["id"] for component in components}
    reference_ids = {reference["id"] for reference in references}
    action_ids = {action["id"] for action in actions}
    event_ids = {
        item["id"]
        for component in components if component["type"] == "news_panel"
        for item in component["items"]
    }

    _unique(components, "id", "components", errors)
    _unique(actions, "id", "actions", errors)
    _unique(references, "id", "references", errors)
    for component_index, component in enumerate(components):
        if component["type"] == "news_panel":
            _unique(component["items"], "id", f"components[{component_index}].items", errors)
            for item in component["items"]:
                if item.get("referenceId") and item["referenceId"] not in reference_ids:
                    errors.append(f"components[{component_index}].items: missing reference")
        elif component["type"] == "time_series":
            if component.get("referenceId") and component["referenceId"] not in reference_ids:
                errors.append(f"components[{component_index}].referenceId: missing reference")
            if any(point.get("eventId") and point["eventId"] not in event_ids for point in component["points"]):
                errors.append(f"components[{component_index}].points: missing event")
        elif component["type"] == "scene_3d":
            if len(component["weights"]) != len(component["layers"]) - 1:
                errors.append(f"components[{component_index}].weights: incorrect matrix count")
            for step, matrix in enumerate(component["weights"]):
                if step + 1 >= len(component["layers"]):
                    continue
                if len(matrix) != component["layers"][step + 1] or any(len(row) != component["layers"][step] for row in matrix):
                    errors.append(f"components[{component_index}].weights[{step}]: matrix dimensions do not match layers")
        elif component["type"] == "control":
            if component["actionId"] not in action_ids:
                errors.append(f"components[{component_index}].actionId: missing action")
            if component["controlType"] == "slider" and (
                "min" not in component or "max" not in component or "value" not in component
                or component["min"] >= component["max"]
                or not component["min"] <= component["value"] <= component["max"]
            ):
                errors.append(f"components[{component_index}]: invalid slider range")

    for action_index, action in enumerate(actions):
        target_exists = action["referenceId"] in reference_ids if action["type"] == "navigate" else action["targetComponentId"] in component_ids
        if not target_exists:
            errors.append(f"actions[{action_index}]: target does not exist")
    for reference_index, reference in enumerate(references):
        try:
            url = urlsplit(reference["url"])
            safe = url.scheme == "https" and bool(url.hostname) and url.username is None and url.password is None
        except ValueError:
            safe = False
        if not safe:
            errors.append(f"references[{reference_index}].url: unsafe URL")
    return errors


def validate_user_action(action: Any, scene: dict[str, Any]) -> list[str]:
    errors = [f"{error.json_path}: invalid value" for error in _action_validator.iter_errors(action)]
    if errors or not isinstance(action, dict):
        return errors or ["$: expected object"]
    if action["sessionId"] != scene["sessionId"] or action["sceneRevision"] != scene["revision"]:
        errors.append("$: stale session or scene revision")
        return errors
    definition = next((item for item in scene["actions"] if item["id"] == action["actionId"]), None)
    component = next((item for item in scene["components"] if item["id"] == action["componentId"]), None)
    if definition is None or component is None:
        errors.append("$: action or component does not exist in scene")
    elif definition["type"] != "navigate" and definition["targetComponentId"] != component["id"]:
        errors.append("componentId: component is not the action target")
    return errors
