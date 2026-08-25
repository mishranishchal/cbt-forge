import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

from schemas.configuration import BulkQuestionUpdate, ReorderQuestionsRequest, TestConfiguration
from schemas.question import Question, QuestionUpdate
from services.configuration_service import ConfigurationService
from services.question_bank_service import QuestionBankService
from services.validation_service import ValidationService, summarize_validation
from utils.files import TEST_DIR, read_json, test_dir, write_json

router = APIRouter(prefix="/api", tags=["questions"])
ID_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")


def _validate_id(value: str, label: str = "ID") -> str:
    if not ID_PATTERN.fullmatch(value):
        raise HTTPException(status_code=400, detail=f"Invalid {label}.")
    return value


def _find_questions_file_by_question_id(question_id: str) -> Path | None:
    for path in TEST_DIR.glob("*/questions.json"):
        questions = read_json(path)
        if any(item.get("id") == question_id for item in questions):
            return path
    return None


@router.get("/questions/{test_id}", response_model=list[Question])
async def get_questions(test_id: str) -> list[Question]:
    _validate_id(test_id, "test ID")
    path = TEST_DIR / test_id / "questions.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Questions not found.")
    return [Question.model_validate(item) for item in read_json(path)]


@router.get("/tests/{test_id}/questions", response_model=list[Question])
async def get_test_questions(test_id: str) -> list[Question]:
    return await get_questions(test_id)


@router.get("/tests/{test_id}")
async def get_test(test_id: str) -> dict:
    _validate_id(test_id, "test ID")
    path = TEST_DIR / test_id / "test.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Test not found.")
    payload = read_json(path)
    configuration_path = test_dir(test_id) / "configuration.json"
    if configuration_path.exists():
        payload["configuration"] = read_json(configuration_path)
    return payload


@router.put("/tests/{test_id}")
async def update_test(test_id: str, payload: dict) -> dict:
    _validate_id(test_id, "test ID")
    path = test_dir(test_id) / "test.json"
    current = read_json(path) if path.exists() else {"test_id": test_id}
    allowed = {"title", "description", "status"}
    for key in allowed:
        if key in payload:
            current[key] = payload[key]
    write_json(path, current)
    return current


@router.put("/questions/{question_id}", response_model=Question)
async def update_question(question_id: str, update: QuestionUpdate) -> Question:
    _validate_id(question_id, "question ID")
    return QuestionBankService().update_question(question_id, update.model_dump(exclude_unset=True))


@router.delete("/questions/{question_id}")
async def delete_question(question_id: str) -> dict[str, str]:
    _validate_id(question_id, "question ID")
    QuestionBankService().delete_question(question_id)
    return {"status": "deleted"}


@router.post("/questions/{question_id}/duplicate", response_model=Question)
async def duplicate_question(question_id: str) -> Question:
    _validate_id(question_id, "question ID")
    return QuestionBankService().duplicate(question_id)


@router.post("/questions/bulk-update", response_model=list[Question])
async def bulk_update_questions(request: BulkQuestionUpdate) -> list[Question]:
    for question_id in request.question_ids:
        _validate_id(question_id, "question ID")
    return QuestionBankService().bulk_update(request)


@router.post("/questions/reorder", response_model=list[Question])
async def reorder_questions(request: ReorderQuestionsRequest) -> list[Question]:
    _validate_id(request.test_id, "test ID")
    for question_id in request.question_ids:
        _validate_id(question_id, "question ID")
    return QuestionBankService().reorder(request)


@router.post("/tests/{test_id}/organize", response_model=list[Question])
async def organize_questions(test_id: str) -> list[Question]:
    _validate_id(test_id, "test ID")
    return await QuestionBankService().organize_missing_metadata(test_id)


@router.get("/tests/{test_id}/configuration", response_model=TestConfiguration)
async def get_configuration(test_id: str) -> TestConfiguration:
    _validate_id(test_id, "test ID")
    return ConfigurationService().get_or_create(test_id)


@router.put("/tests/{test_id}/configuration", response_model=TestConfiguration)
async def save_configuration(test_id: str, configuration: TestConfiguration) -> TestConfiguration:
    _validate_id(test_id, "test ID")
    if configuration.test.id != test_id:
        configuration.test.id = test_id
    return ConfigurationService().save(test_id, configuration)


@router.post("/tests/{test_id}/validate")
async def validate_configuration(test_id: str, configuration: TestConfiguration | None = None) -> dict:
    _validate_id(test_id, "test ID")
    result = ConfigurationService().validate(test_id, configuration)
    return result.model_dump(mode="json")
