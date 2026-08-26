from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class AttemptStatus(str, Enum):
    not_started = "NOT_STARTED"
    in_progress = "IN_PROGRESS"
    completed = "COMPLETED"
    timed_out = "TIMED_OUT"
    abandoned = "ABANDONED"


class SubmissionReason(str, Enum):
    manual = "MANUAL"
    timeout = "TIMEOUT"
    section_timeout = "SECTION_TIMEOUT"
    system = "SYSTEM"


class QuestionRuntimeStatus(str, Enum):
    not_visited = "NOT_VISITED"
    not_answered = "NOT_ANSWERED"
    answered = "ANSWERED"
    marked_for_review = "MARKED_FOR_REVIEW"
    answered_and_marked = "ANSWERED_AND_MARKED"


class ResponseUpdate(BaseModel):
    selected_answers: list[str] | None = None
    numeric_value: str | None = None
    text_answer: str | None = None
    visited: bool | None = None
    marked_for_review: bool | None = None
    time_spent_seconds: int | None = Field(default=None, ge=0)
    last_updated: str | None = None
    current_section: str | None = None
    current_question: str | None = None


class AttemptEventCreate(BaseModel):
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)


class SubmitRequest(BaseModel):
    reason: SubmissionReason = SubmissionReason.manual
    current_section: str | None = None
    current_question: str | None = None


class CreateAttemptRequest(BaseModel):
    resume_if_active: bool = True
