from pathlib import Path
from uuid import uuid4

import pytest

from schemas.configuration import MarkingScheme
from schemas.question import Option, Question, QuestionImage
from services.configuration_service import ConfigurationService
from services.question_bank_service import QuestionBankService
from utils.files import test_dir as get_test_dir, write_json


def seed_test() -> tuple[str, list[Question]]:
    test_id = f"phase2_{uuid4().hex[:8]}"
    questions = [
        Question(
            id=f"q_{uuid4().hex}",
            question_number=1,
            question_text="What is 25% of 200?",
            question_type="single_choice",
            options=[Option(id="A", text="25"), Option(id="B", text="50")],
            correct_answer=["B"],
            section="Quantitative Aptitude",
            topic="Percentage",
            difficulty="easy",
        ),
        Question(
            id=f"q_{uuid4().hex}",
            question_number=2,
            question_text="Select prime numbers.",
            question_type="multiple_choice",
            options=[Option(id="A", text="2"), Option(id="B", text="4"), Option(id="C", text="5")],
            correct_answer=["A", "C"],
            section="Quantitative Aptitude",
            topic="Numbers",
            difficulty="medium",
        ),
    ]
    directory = get_test_dir(test_id)
    write_json(directory / "questions.json", [question.model_dump(mode="json") for question in questions])
    write_json(directory / "test.json", {"test_id": test_id})
    return test_id, questions


def test_question_duplication_uses_stable_new_id() -> None:
    test_id, questions = seed_test()
    duplicated = QuestionBankService().duplicate(questions[0].id)
    assert duplicated.id != questions[0].id
    assert duplicated.id.startswith(f"{questions[0].id}-copy-")
    assert len(QuestionBankService().load(test_id)) == 3


def test_question_reordering_persists_order() -> None:
    test_id, questions = seed_test()
    reordered = QuestionBankService().reorder(type("Request", (), {"test_id": test_id, "question_ids": [questions[1].id, questions[0].id]})())
    assert [question.id for question in reordered[:2]] == [questions[1].id, questions[0].id]
    assert [question.id for question in QuestionBankService().load(test_id)[:2]] == [questions[1].id, questions[0].id]


def test_bulk_editing_changes_section_topic_difficulty() -> None:
    _, questions = seed_test()
    request = type(
        "Bulk",
        (),
        {
            "question_ids": [questions[0].id],
            "model_dump": lambda self, **_: {"section": "Maths", "topic": "Percentages", "difficulty": "hard"},
        },
    )()
    updated = QuestionBankService().bulk_update(request)
    assert updated[0].section == "Maths"
    assert updated[0].topic == "Percentages"
    assert updated[0].difficulty == "hard"


def test_section_creation_and_configuration_persistence() -> None:
    test_id, questions = seed_test()
    service = ConfigurationService()
    config = service.get_or_create(test_id)
    config.sections.append(service.new_section("Reasoning"))
    config.sections[-1].question_ids = [questions[0].id]
    saved = service.save(test_id, config)
    reloaded = service.get_or_create(test_id)
    assert len(saved.sections) == len(reloaded.sections)
    assert reloaded.sections[-1].name == "Reasoning"


def test_configuration_validation_detects_empty_section() -> None:
    test_id, _ = seed_test()
    service = ConfigurationService()
    config = service.get_or_create(test_id)
    config.sections[0].question_ids = []
    result = service.validate(test_id, config)
    assert not result.valid
    assert any("must contain at least one question" in error for error in result.errors)


def test_timing_and_marking_validation() -> None:
    with pytest.raises(ValueError):
        MarkingScheme(correct=-1, wrong=-0.25, unattempted=0)
    with pytest.raises(ValueError):
        MarkingScheme(correct=1, wrong=0.25, unattempted=0)


def test_image_path_validation_marks_missing_image_error() -> None:
    question = Question(
        id=f"q_{uuid4().hex}",
        question_number=1,
        question_text="Refer to image.",
        question_type="image_based",
        images=[QuestionImage(path="extracted_images/missing.png")],
    )
    from services.validation_service import ValidationService

    validated = ValidationService().validate_questions([question])[0]
    assert validated.validation_status == "error"
    assert any("Image file does not exist" in warning for warning in validated.warnings)
