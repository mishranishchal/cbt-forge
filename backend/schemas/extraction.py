from enum import Enum

from pydantic import BaseModel, Field

from schemas.question import Question, QuestionImage


class FileRole(str, Enum):
    question_paper = "question_paper"
    answer_key = "answer_key"
    explanation = "explanation"
    other = "other"


class UploadedFileRecord(BaseModel):
    id: str
    filename: str
    role: FileRole
    path: str
    size: int
    image_asset: QuestionImage | None = None


class TextPayload(BaseModel):
    question_text: str | None = None
    answer_key_text: str | None = None
    explanation_text: str | None = None


class UploadResponse(BaseModel):
    test_id: str
    files: list[UploadedFileRecord]
    text: TextPayload


class ExtractRequest(BaseModel):
    test_id: str
    use_demo: bool = False


class ExtractionSummary(BaseModel):
    questions_found: int
    valid: int
    warnings: int
    errors: int
    pages_total: int = 0
    pages_processed: int = 0
    pages_ocr: int = 0
    pages_failed: int = 0
    warnings_list: list[str] = Field(default_factory=list)


class TestRecord(BaseModel):
    test_id: str
    status: str
    files: list[UploadedFileRecord] = Field(default_factory=list)
    summary: ExtractionSummary | None = None


class ExtractResponse(BaseModel):
    test_id: str
    status: str
    message: str
    summary: ExtractionSummary
    questions: list[Question]
