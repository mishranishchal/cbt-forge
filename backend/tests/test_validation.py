from schemas.question import Option, Question
from services.extraction_service import ExtractionService
from services.validation_service import ValidationService
from utils.text import parse_answer_key, parse_explanations


def test_question_validation_valid_question() -> None:
    question = Question(
        id="q001",
        question_number=1,
        question_text="What is 25% of 200?",
        question_type="single_choice",
        options=[Option(id="A", text="25"), Option(id="B", text="50")],
        correct_answer=["B"],
    )
    validated = ValidationService().validate_questions([question])[0]
    assert validated.validation_status == "valid"


def test_answer_key_matching() -> None:
    answers = parse_answer_key("1-A\nQ2 B\nQuestion 3: C\n4. D")
    assert answers == {1: ["A"], 2: ["B"], 3: ["C"], 4: ["D"]}


def test_duplicate_question_numbers() -> None:
    questions = [
        Question(id="q001", question_number=1, question_text="A?", options=[], correct_answer=None),
        Question(id="q002", question_number=1, question_text="B?", options=[], correct_answer=None),
    ]
    validated = ValidationService().validate_questions(questions)
    assert validated[1].validation_status == "error"
    assert "Duplicate question number." in validated[1].warnings


def test_missing_correct_answer_is_warning() -> None:
    question = Question(id="q001", question_number=1, question_text="A?", question_type="unknown")
    validated = ValidationService().validate_questions([question])[0]
    assert validated.validation_status == "warning"
    assert "Correct answer is missing or uncertain." in validated.warnings


def test_missing_explanation_not_invented() -> None:
    questions = [Question(id="q001", question_number=1, question_text="A?", options=[Option(id="A", text="Yes")], correct_answer=None)]
    matched = ExtractionService()._match_answers_and_explanations(questions, {1: ["A"]}, {})
    assert matched[0].explanation is None


def test_explanation_matching() -> None:
    explanations = parse_explanations("1. Because it is correct.\n2. Second reason.")
    assert explanations[1] == "Because it is correct."
    assert explanations[2] == "Second reason."
