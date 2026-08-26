import re
from typing import Any


QUESTION_RE = re.compile(r"^\s*(?:Q\s*)?(\d+)\s*[.)-]\s*(.*)$|^\s*Question\s+(\d+)\s*[:.)-]?\s*(.*)$", re.I)
OPTION_RE = re.compile(r"^\s*([A-H])\s*[.)-]\s*(.+)$", re.I)
FIELD_RE = re.compile(
    r"^\s*(ANSWER|EXPLANATION|TOPIC|DIFFICULTY|TYPE|QUESTION_TYPE|TOLERANCE|"
    r"CORRECT_MARKS|INCORRECT_MARKS|UNATTEMPTED_MARKS|ACCEPTED_ANSWERS|"
    r"QUESTION_IMAGE|EXPLANATION_IMAGE|OPTION_IMAGE)\s*:\s*(.*)$",
    re.I,
)
SECTION_RE = re.compile(r"^\s*\[SECTION\s*:\s*(.+?)\]\s*$", re.I)


def parse_text(text: str) -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    mode = "question"
    section: str | None = None

    def flush() -> None:
        nonlocal current
        if current is None:
            return
        current["question_text"] = "\n".join(current.pop("_question_lines", [])).strip()
        if "_explanation_lines" in current:
            text = "\n".join(current.pop("_explanation_lines")).strip() or None
            existing = current.get("explanation")
            current["explanation"] = (
                {**existing, "text": text}
                if isinstance(existing, dict)
                else text
            )
        questions.append(current)
        current = None

    for raw_line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = raw_line.rstrip()
        section_match = SECTION_RE.match(line)
        if section_match:
            section = section_match.group(1).strip() or None
            continue
        question_match = QUESTION_RE.match(line)
        if question_match:
            flush()
            number = question_match.group(1) or question_match.group(3)
            initial = question_match.group(2) if question_match.group(1) else question_match.group(4)
            current = {"question_number": int(number), "section": section, "options": [], "_question_lines": [initial.strip()] if initial.strip() else []}
            mode = "question"
            continue
        if current is None:
            continue
        option_match = OPTION_RE.match(line)
        if option_match:
            current["options"].append({"id": option_match.group(1).upper(), "text": option_match.group(2).strip()})
            mode = "option"
            continue
        field_match = FIELD_RE.match(line)
        if field_match:
            field, value = field_match.group(1).lower(), field_match.group(2).strip()
            if field == "answer":
                current["answer"] = value
            elif field == "explanation":
                current["_explanation_lines"] = [value] if value else []
            elif field in {"type", "question_type"}:
                current["question_type"] = value
            elif field == "tolerance":
                current["tolerance"] = value
            elif field == "accepted_answers":
                current["accepted_answers"] = value
            elif field == "question_image":
                current.setdefault("question_images", []).append({"filename": value})
            elif field == "explanation_image":
                explanation = current.setdefault("explanation", {"text": None, "images": []})
                if isinstance(explanation, dict):
                    explanation.setdefault("images", []).append({"filename": value})
            elif field == "option_image":
                option_id, separator, filename = value.partition(",")
                option_id = option_id.strip().upper()
                filename = filename.strip() if separator else ""
                option = next((item for item in current["options"] if item["id"] == option_id), None)
                if option and filename:
                    option.setdefault("images", []).append({"filename": filename})
            elif field in {"correct_marks", "incorrect_marks", "unattempted_marks"}:
                marking = current.setdefault("marking", {})
                marking[{
                    "correct_marks": "correct",
                    "incorrect_marks": "wrong",
                    "unattempted_marks": "unattempted",
                }[field]] = value
                marking["override_default"] = True
            else:
                current[field] = value
            mode = field
            continue
        if mode == "explanation":
            current.setdefault("_explanation_lines", []).append(line.strip())
        elif line.strip() and mode == "question":
            current["_question_lines"].append(line.strip())
    flush()
    return questions
