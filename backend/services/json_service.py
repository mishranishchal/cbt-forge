import json
from pathlib import Path
from typing import Any


class JSONInputError(ValueError):
    pass


def parse_json(path: str | Path) -> list[dict[str, Any]]:
    try:
        payload = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise JSONInputError(f"Invalid JSON file: {exc}") from exc
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        questions = payload.get("questions", payload.get("items"))
        if isinstance(questions, list):
            return questions
    raise JSONInputError("JSON must be a question array or an object with a questions array.")
