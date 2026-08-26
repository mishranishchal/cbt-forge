from schemas.configuration import MarkingScheme, TestConfiguration, TestMetadata, TestSection
from schemas.question import AnswerConfig, AnswerInputMode, Option, Question, QuestionType
from services.scoring_service import derive_runtime_status, score_attempt
from services.validation_service import ValidationService


def make_question(question_type: QuestionType, *, answer: list[str], number: int = 1) -> Question:
    return Question(
        id=f"q{number}",
        question_number=number,
        section="Section A" if number == 1 else "Section B",
        question_type=question_type,
        question_text="Question text",
        options=[Option(id="A", text="A"), Option(id="B", text="B")],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.integer if question_type == QuestionType.integer else AnswerInputMode.single_choice,
            correct_answers=answer,
        ),
    )


def test_section_marking_is_used_when_overall_marking_is_disabled() -> None:
    first = make_question(QuestionType.single_choice, answer=["A"], number=1)
    second = make_question(QuestionType.single_choice, answer=["B"], number=2)
    config = TestConfiguration(
        test=TestMetadata(
            id="marking-test",
            use_global_marking=False,
            global_marking=MarkingScheme(correct="99", wrong="-99", unattempted="0"),
        ),
        sections=[
            TestSection(id="a", name="Section A", question_ids=[first.id], marking=MarkingScheme(correct="2", wrong="-1", unattempted="0")),
            TestSection(id="b", name="Section B", question_ids=[second.id], marking=MarkingScheme(correct="5", wrong="-2", unattempted="0")),
        ],
    )

    scored = score_attempt(
        config,
        [first, second],
        {first.id: {"selected_answers": ["A"]}, second.id: {"selected_answers": ["A"]}},
    )

    assert scored["score"] == 0
    assert scored["question_results"][0]["marks"] == 2
    assert scored["question_results"][1]["marks"] == -2


def test_typed_answers_have_answered_runtime_status_and_clear_cleanly() -> None:
    assert derive_runtime_status(True, [], False, numeric_value="42") == "ANSWERED"
    assert derive_runtime_status(True, [], True, text_answer="An explanation") == "ANSWERED_AND_MARKED"
    assert derive_runtime_status(True, [], False, numeric_value=None, text_answer=None) == "NOT_ANSWERED"


def test_integer_validation_uses_a_human_readable_typed_message() -> None:
    question = make_question(QuestionType.integer, answer=["not-a-number"])
    validated = ValidationService().validate_questions([question])[0]

    assert validated.validation_status == "error"
    assert "Q1: Integer question requires answer.value to be a valid integer." in validated.warnings
