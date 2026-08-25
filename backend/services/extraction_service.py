import re
from pathlib import Path
from typing import Any

from schemas.extraction import ExtractionSummary, UploadedFileRecord
from schemas.question import Option, Question, QuestionType
from services.input_parser import InputValidationError, ParsedInput, parse_input
from services.question_normalizer import normalize_question
from services.text_service import parse_text
from services.validation_service import ValidationService, summarize_validation
from utils.files import read_json, test_dir, write_json
from utils.text import normalize_whitespace, parse_answer_key, parse_explanations


QUESTION_PATTERN = re.compile(r"(?:^|\n)\s*(?:Q\.?\s*)?(\d{1,4})[\).:-]\s*(.*?)(?=(?:\n\s*(?:Q\.?\s*)?\d{1,4}[\).:-]\s*)|\Z)", re.S | re.I)
OPTION_PATTERN = re.compile(r"(?:^|\n)\s*([A-H])[\).:-]\s+(.+?)(?=(?:\n\s*[A-H][\).:-]\s+)|\Z)", re.S | re.I)


class ExtractionService:
    """Local-first pipeline: parser -> normalizer -> validator -> question bank."""

    def __init__(self) -> None:
        self.validation_service = ValidationService()

    async def extract(self, test_id: str, use_demo: bool = False) -> tuple[list[Question], ExtractionSummary]:
        if use_demo:
            questions = self.validation_service.validate_questions(demo_questions())
            return self._persist(test_id, questions, {})
        upload_payload = read_json(test_dir(test_id) / "upload.json")
        files = [UploadedFileRecord.model_validate(item) for item in upload_payload.get("files", [])]
        text_payload = upload_payload.get("text", {})
        question_text = text_payload.get("question_text") or ""
        answer_key_text = text_payload.get("answer_key_text") or ""
        explanation_text = text_payload.get("explanation_text") or ""
        questions: list[Question] = []
        image_assets = [record.image_asset for record in files if record.image_asset]
        asset_index = {asset.filename.casefold(): asset for asset in image_assets if asset and asset.filename}
        report: dict[str, Any] = {"pages_total": 0, "pages_processed": 0, "pages_ocr": 0, "pages_failed": 0, "warnings_list": []}
        for record in files:
            if record.image_asset:
                continue
            try:
                parsed = parse_input(Path(record.path), test_id)
            except (InputValidationError, ValueError) as exc:
                raise RuntimeError(str(exc)) from exc
            self._merge_report(report, parsed)
            if record.role == "question_paper":
                questions.extend(self._questions_from_parsed(parsed, len(questions), asset_index))
            elif parsed.kind == "json":
                report["warnings_list"].append(f"{record.filename} was ignored because JSON imports must be a question paper.")
            elif record.role == "answer_key":
                answer_key_text += "\n" + parsed.text
            elif record.role == "explanation":
                explanation_text += "\n" + parsed.text
        if question_text.strip():
            questions.extend(self._questions_from_parsed(ParsedInput(kind="txt", raw_questions=parse_text(question_text), text=question_text), len(questions), asset_index))
        questions = self._match_answers_and_explanations(questions, parse_answer_key(answer_key_text), parse_explanations(explanation_text))
        self._scope_question_ids(test_id, questions)
        questions = self.validation_service.validate_questions(questions)
        return self._persist(test_id, questions, report)

    def _questions_from_parsed(self, parsed: ParsedInput, start_index: int, asset_index: dict[str, object] | None = None) -> list[Question]:
        questions: list[Question] = []
        if parsed.kind == "pdf":
            for page_number, items in parsed.page_questions:
                source_items = items or self._legacy_questions(parsed.text if parsed.pages_total == 1 else "", page_number)
                page_images = [item for item in parsed.images if item.get("page_number") == page_number]
                for item in source_items:
                    data = dict(item)
                    data["images"] = page_images
                    questions.append(normalize_question(data, start_index + len(questions) + 1, page_number, asset_index))
        else:
            for item in parsed.raw_questions:
                questions.append(normalize_question(item, start_index + len(questions) + 1, asset_index=asset_index))
            if not questions and parsed.text.strip():
                for item in self._legacy_questions(parsed.text, None):
                    questions.append(normalize_question(item, start_index + len(questions) + 1, asset_index=asset_index))
        return questions

    def _legacy_questions(self, text: str, source_page: int | None) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for match in QUESTION_PATTERN.finditer(normalize_whitespace(text)):
            body = match.group(2).strip()
            options = [{"id": item.group(1).upper(), "text": normalize_whitespace(item.group(2))} for item in OPTION_PATTERN.finditer(body)]
            items.append({"question_number": int(match.group(1)), "question_text": OPTION_PATTERN.split(body)[0].strip(), "options": options, "source_page": source_page})
        return items

    def _match_answers_and_explanations(self, questions: list[Question], answers: dict[int, list[str]], explanations: dict[int, str]) -> list[Question]:
        for question in questions:
            if question.question_number is None:
                question.warnings.append("Answer could not be confidently matched.")
                continue
            if question.question_number in answers:
                question.correct_answer = answers[question.question_number]
            elif not question.correct_answer:
                question.warnings.append("Correct answer is missing or uncertain.")
            if not question.explanation and explanations.get(question.question_number):
                question.explanation = {"text": explanations[question.question_number], "images": []}
        return questions

    def _merge_report(self, report: dict[str, Any], parsed: ParsedInput) -> None:
        for field in ("pages_total", "pages_processed", "pages_ocr", "pages_failed"):
            report[field] += getattr(parsed, field)
        report["warnings_list"].extend(parsed.warnings)

    def _persist(self, test_id: str, questions: list[Question], report: dict[str, Any]) -> tuple[list[Question], ExtractionSummary]:
        data = summarize_validation(questions)
        data.update({key: report.get(key, 0) for key in ("pages_total", "pages_processed", "pages_ocr", "pages_failed")})
        data["warnings_list"] = list(dict.fromkeys(report.get("warnings_list", [])))
        summary = ExtractionSummary.model_validate(data)
        directory = test_dir(test_id)
        write_json(directory / "questions.json", [question.model_dump(mode="json") for question in questions])
        write_json(directory / "test.json", {"test_id": test_id, "status": "extracted", "summary": summary.model_dump()})
        return questions, summary

    def _scope_question_ids(self, test_id: str, questions: list[Question]) -> None:
        safe_test_id = re.sub(r"[^A-Za-z0-9_.-]+", "_", test_id)
        seen: set[str] = set()
        for index, question in enumerate(questions, start=1):
            base = f"{safe_test_id}_{question.id or f'q{index:03d}'}"
            candidate = base
            suffix = 1
            while candidate in seen:
                if "Duplicate question ID." not in question.warnings:
                    question.warnings.append("Duplicate question ID.")
                suffix += 1
                candidate = f"{base}_{suffix}"
            question.id = candidate
            seen.add(candidate)


def demo_questions() -> list[Question]:
    base = [
        ("What is 25% of 200?", [("A", "25"), ("B", "50"), ("C", "75"), ("D", "100")], ["B"], "25% of 200 = 50.", "Percentages", "easy"),
        ("Which gas is most abundant in Earth's atmosphere?", [("A", "Oxygen"), ("B", "Nitrogen"), ("C", "Carbon dioxide"), ("D", "Hydrogen")], ["B"], "Nitrogen makes up most of the atmosphere.", "Science", "medium"),
        ("The capital of France is Paris.", [("A", "True"), ("B", "False")], ["A"], "Paris is the capital city of France.", None, "medium"),
    ]
    return [Question(id=f"demo_q{index:03d}", question_number=index, question_text=text, options=[Option(id=key, text=value) for key, value in options], correct_answer=answer, explanation=explanation, topic=topic, question_type=QuestionType.true_false if len(options) == 2 and options[0][1] == "True" else QuestionType.single_choice, difficulty=difficulty, confidence=0.95) for index, (text, options, answer, explanation, topic, difficulty) in enumerate(base, start=1)]
