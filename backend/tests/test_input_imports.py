from pathlib import Path
from uuid import uuid4

import fitz
import pytest

from services.ai_service import AIServiceError, OpenRouterProvider
from services.input_parser import InputValidationError, parse_input
from services.question_normalizer import normalize_answer, normalize_options, normalize_questions
from services.validation_service import ValidationService
from services.text_service import parse_text
from utils.files import TEST_DIR


def unit_dir() -> Path:
    path = TEST_DIR / f"imports_{uuid4().hex[:8]}"
    path.mkdir(parents=True, exist_ok=True)
    return path


SAMPLE_TEXT = """[SECTION: Reasoning]
Q1. What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
ANSWER: B
EXPLANATION:
2 + 2 = 4.
TOPIC: Arithmetic
DIFFICULTY: Easy
"""


def test_txt_input_and_answer_normalization() -> None:
    normalized = normalize_questions(parse_text(SAMPLE_TEXT))
    assert normalized[0].section == "Reasoning"
    assert normalized[0].correct_answer == ["B"]
    assert normalized[0].explanation and normalized[0].explanation.text == "2 + 2 = 4."


def test_txt_typed_answers_and_image_references_are_normalized() -> None:
    source = """[SECTION: Mixed]
Q1. Select all prime numbers.
TYPE: multiple_select
A. 2
B. 4
C. 5
ANSWER: A, C

Q2. Calculate 6 x 7.
TYPE: integer
ANSWER: 42

Q3. Name the capital of India.
TYPE: short_answer
ANSWER: New Delhi
ACCEPTED_ANSWERS: Delhi; New Delhi, India

Q4. Choose the figure.
TYPE: image_based
QUESTION_IMAGE: q4.png
A. First figure
OPTION_IMAGE: A, q4-a.png
B. Second figure
ANSWER: B
EXPLANATION: See the solution.
EXPLANATION_IMAGE: q4-solution.png
"""
    questions = normalize_questions(parse_text(source))

    assert questions[0].answer_config.correct_answers == ["A", "C"]
    assert questions[1].numerical_answer and str(questions[1].numerical_answer.value) == "42"
    assert questions[2].answer_config.correct_answers == ["New Delhi"]
    assert questions[2].answer_config.accepted_answers == ["Delhi", "New Delhi, India"]
    assert questions[3].question_images[0].filename == "q4.png"
    assert questions[3].options[0].images[0].filename == "q4-a.png"
    assert questions[3].explanation and questions[3].explanation.images[0].filename == "q4-solution.png"


def test_empty_txt_is_allowed_without_questions() -> None:
    path = unit_dir() / "empty.txt"
    path.write_text("\n", encoding="utf-8")
    assert parse_input(path).raw_questions == []


def test_json_option_and_answer_formats() -> None:
    path = unit_dir() / "questions.json"
    path.write_text('{"questions":[{"stem":"Example?","options":{"A":"One","B":"Two"},"answer":"Option B"},{"stem":"Second?","options":["One","Two"],"answer":["b"]}]}', encoding="utf-8")
    normalized = normalize_questions(parse_input(path).raw_questions)
    assert normalized[0].correct_answer == ["B"]
    assert normalized[1].correct_answer == ["B"]
    assert normalize_options([{"id": "A", "text": "One"}])[0].id == "A"
    assert normalize_answer("Option B", normalize_options({"A": "One", "B": "Two"}))[0] == ["B"]


def test_malformed_question_is_preserved_for_review() -> None:
    question = normalize_questions([{"id": "bad", "question_number": "not-a-number", "question_text": None, "options": [], "confidence": "bad"}])[0]
    assert question.question_text == ""
    assert "Question number is invalid." in question.warnings
    assert "Confidence is invalid." in question.warnings


def test_duplicate_question_number_is_an_individual_error() -> None:
    questions = normalize_questions([
        {"question_number": 1, "question_text": "One?", "options": ["A", "B"], "answer": "A"},
        {"question_number": 1, "question_text": "Two?", "options": ["A", "B"], "answer": "A"},
    ])
    assert ValidationService().validate_questions(questions)[1].validation_status == "error"


def test_invalid_json_and_unsupported_file_are_clear_errors() -> None:
    directory = unit_dir()
    invalid = directory / "invalid.json"
    invalid.write_text("{bad", encoding="utf-8")
    with pytest.raises(ValueError, match="Invalid JSON"):
        parse_input(invalid)
    unsupported = directory / "questions.docx"
    unsupported.write_text("x", encoding="utf-8")
    with pytest.raises(InputValidationError, match="Supported formats"):
        parse_input(unsupported)


def test_scanned_or_mixed_pdf_continues() -> None:
    directory = unit_dir()
    pdf_path = directory / "mixed.pdf"
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Q1. Text question?\nA. One\nB. Two")
    document.new_page()
    document.save(pdf_path)
    document.close()
    parsed = parse_input(pdf_path, "pytest")
    assert parsed.pages_total == 2
    assert parsed.pages_processed == 2
    assert parsed.pages_failed == 0


@pytest.mark.asyncio
async def test_ai_is_disabled_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AI_ENABLED", raising=False)
    with pytest.raises(AIServiceError, match="currently disabled"):
        await OpenRouterProvider().extract_questions(["Q1. Example?"])
