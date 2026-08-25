from enum import Enum
import re
from typing import Literal, Any

from pydantic import BaseModel, Field, field_validator, model_validator


# ============================================================================
# ENUMS
# ============================================================================


class QuestionType(str, Enum):
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"
    multiple_select = "multiple_select"

    true_false = "true_false"

    integer = "integer"
    real_number = "real_number"
    numerical_tolerance = "numerical_tolerance"

    short_answer = "short_answer"
    long_answer = "long_answer"

    image_based = "image_based"

    unknown = "unknown"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
    unknown = "unknown"


class ValidationStatus(str, Enum):
    valid = "valid"
    warning = "warning"
    error = "error"


class EvaluationMode(str, Enum):
    automatic = "automatic"
    manual = "manual"


class AnswerInputMode(str, Enum):
    single_choice = "single_choice"
    multiple_select = "multiple_select"
    integer = "integer"
    real_number = "real_number"
    text = "text"
    long_text = "long_text"


# ============================================================================
# MARKING VALIDATION
# ============================================================================


def _validate_mark_value(value: Any, field_name: str) -> str:
    """
    Preserve marking values as strings.

    Examples:
        1
        1.5
        -0.33
        -1/3
        +2
        0

    Keeping the original textual representation is important because:

        -0.33

    and

        -1/3

    are intentionally different marking rules.
    """

    value = str(value).strip()

    if not value:
        raise ValueError(f"{field_name} cannot be empty.")

    decimal_pattern = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)"
    fraction_pattern = r"[+-]?\d+\s*/\s*[+-]?\d+"

    if not (
        re.fullmatch(decimal_pattern, value)
        or re.fullmatch(fraction_pattern, value)
    ):
        raise ValueError(
            f"{field_name} must be a valid integer, decimal, or fraction "
            f"(examples: 1, 1.5, -0.33, -1/3)."
        )

    if "/" in value:
        _, denominator = value.split("/", 1)

        try:
            denominator_value = int(denominator.strip())
        except ValueError:
            raise ValueError(
                f"{field_name} has an invalid fraction denominator."
            )

        if denominator_value == 0:
            raise ValueError(
                f"{field_name} cannot have a zero denominator."
            )

    return value


# ============================================================================
# IMAGE
# ============================================================================


class QuestionImage(BaseModel):
    id: str | None = None
    path: str
    filename: str | None = None
    mime_type: str | None = None
    alt_text: str | None = None
    width: int | None = None
    height: int | None = None

    type: Literal[
        "question_image",
        "page_render",
        "embedded_image",
    ] = "question_image"

    page_number: int | None = None


# ============================================================================
# OPTION
# ============================================================================


class Option(BaseModel):
    id: str = Field(
        min_length=1,
        max_length=8,
    )

    text: str = ""

    images: list[QuestionImage] = Field(
        default_factory=list
    )


# ============================================================================
# EXPLANATION
# ============================================================================


class Explanation(BaseModel):
    text: str | None = None

    images: list[QuestionImage] = Field(
        default_factory=list
    )


# ============================================================================
# ANSWER CONFIGURATION
# ============================================================================


class AnswerConfig(BaseModel):
    """
    Defines how the candidate answers the question.
    """

    input_mode: AnswerInputMode | None = None

    correct_answers: list[str] = Field(
        default_factory=list
    )

    accepted_answers: list[str] = Field(
        default_factory=list
    )

    tolerance: str | None = None

    case_sensitive: bool = False

    evaluation: EvaluationMode = EvaluationMode.automatic

    @field_validator("tolerance")
    @classmethod
    def validate_tolerance(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError(
                "Tolerance cannot be empty."
            )

        decimal_pattern = r"[+]?(?:\d+(?:\.\d*)?|\.\d+)"

        if not re.fullmatch(
            decimal_pattern,
            value,
        ):
            raise ValueError(
                "Tolerance must be a non-negative integer or decimal."
            )

        try:
            numeric_value = float(value)
        except ValueError:
            raise ValueError(
                "Tolerance must be numeric."
            )

        if numeric_value < 0:
            raise ValueError(
                "Tolerance cannot be negative."
            )

        return value


# ============================================================================
# NUMERICAL ANSWER
# ============================================================================


class NumericalAnswer(BaseModel):
    """
    Configuration/value for integer, real-number and numerical-tolerance
    questions.

    The actual value is preserved as a string where possible so that decimal
    representations are not unnecessarily changed.
    """

    value: str | int | float | None = None

    tolerance: str = "0"

    allow_integer: bool = True

    allow_decimal: bool = True

    @field_validator("value", mode="before")
    @classmethod
    def normalize_value(
        cls,
        value: Any,
    ) -> str | int | float | None:

        if value is None:
            return None

        if isinstance(value, bool):
            raise ValueError(
                "Numerical answer cannot be boolean."
            )

        if isinstance(value, str):
            value = value.strip()

            if not value:
                raise ValueError(
                    "Numerical answer value cannot be empty."
                )

            return value

        if isinstance(value, (int, float)):
            return value

        raise ValueError(
            "Numerical answer value must be numeric."
        )

    @field_validator("tolerance")
    @classmethod
    def validate_numerical_tolerance(
        cls,
        value: Any,
    ) -> str:

        value = str(value).strip()

        if not value:
            raise ValueError(
                "Numerical tolerance cannot be empty."
            )

        pattern = r"[+]?(?:\d+(?:\.\d*)?|\.\d+)"

        if not re.fullmatch(pattern, value):
            raise ValueError(
                "Numerical tolerance must be a non-negative number."
            )

        if float(value) < 0:
            raise ValueError(
                "Numerical tolerance cannot be negative."
            )

        return value


# ============================================================================
# PER-QUESTION MARKING
# ============================================================================


class MarkingRule(BaseModel):
    """
    Current per-question marking configuration.

    Values are strings so that:

        -0.33

    remains distinct from:

        -1/3
    """

    correct: str = "1"

    incorrect: str = "0"

    unattempted: str = "0"

    maximum_marks: str | None = None

    override_default: bool = False

    @field_validator(
        "correct",
        "incorrect",
        "unattempted",
    )
    @classmethod
    def validate_marking_value(
        cls,
        value: Any,
        info,
    ) -> str:

        return _validate_mark_value(
            value,
            info.field_name,
        )

    @field_validator("maximum_marks")
    @classmethod
    def validate_maximum_marks(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        return _validate_mark_value(
            value,
            "maximum_marks",
        )


# ============================================================================
# LEGACY / NORMALIZER COMPATIBILITY
# ============================================================================


class QuestionMarking(BaseModel):
    """
    Backward-compatible marking model used by older normalizer/scoring code.

    Older code uses `wrong`, while the newer Question model uses `incorrect`.
    """

    correct: str = "1"

    wrong: str = "-0.25"

    unattempted: str = "0"

    maximum_marks: str | None = None

    override_default: bool = False

    @field_validator(
        "correct",
        "wrong",
        "unattempted",
    )
    @classmethod
    def validate_marking_value(
        cls,
        value: Any,
        info,
    ) -> str:

        return _validate_mark_value(
            value,
            info.field_name,
        )

    @field_validator("maximum_marks")
    @classmethod
    def validate_maximum_marks(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        return _validate_mark_value(
            value,
            "maximum_marks",
        )

    def to_marking_rule(self) -> MarkingRule:
        """
        Convert legacy `wrong` representation into the current
        `incorrect` representation.
        """

        return MarkingRule(
            correct=self.correct,
            incorrect=self.wrong,
            unattempted=self.unattempted,
            maximum_marks=self.maximum_marks,
            override_default=self.override_default,
        )


# ============================================================================
# QUESTION
# ============================================================================


class Question(BaseModel):
    id: str

    question_number: int | None = None

    section: str | None = None
    topic: str | None = None
    subtopic: str | None = None

    question_type: QuestionType = QuestionType.unknown

    question_text: str

    question_images: list[QuestionImage] = Field(
        default_factory=list
    )

    options: list[Option] = Field(
        default_factory=list
    )

    # Legacy field retained.
    correct_answer: list[str] | None = None

    # New answer configuration.
    answer_config: AnswerConfig = Field(
        default_factory=AnswerConfig
    )

    # Per-question marking.
    marking: MarkingRule = Field(
        default_factory=MarkingRule
    )

    # Numerical answer for integer / real-number questions.
    numerical_answer: NumericalAnswer | None = None

    explanation: Explanation | None = None

    difficulty: Difficulty = Difficulty.unknown

    source_page: int | None = None

    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    validation_status: ValidationStatus = (
        ValidationStatus.warning
    )

    warnings: list[str] = Field(
        default_factory=list
    )

    # ------------------------------------------------------------------
    # Legacy input normalization
    # ------------------------------------------------------------------

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_fields(
        cls,
        value: object,
    ) -> object:

        if not isinstance(value, dict):
            return value

        data = dict(value)

        # --------------------------------------------------------------
        # Legacy images
        # --------------------------------------------------------------

        if "question_images" not in data:
            data["question_images"] = data.pop(
                "images",
                [],
            )

        # --------------------------------------------------------------
        # Legacy explanation string
        # --------------------------------------------------------------

        explanation = data.get("explanation")

        if isinstance(
            explanation,
            str,
        ):
            data["explanation"] = {
                "text": explanation,
                "images": [],
            }

        # --------------------------------------------------------------
        # Legacy correct_answer -> answer_config
        # --------------------------------------------------------------

        answer_config = data.get("answer_config")

        # AnswerConfig may already be a Pydantic model when Question
        # is constructed directly by application code/tests.
        #
        # Convert it to a dictionary so legacy fields can still be merged
        # without silently discarding:
        #   - correct_answers
        #   - accepted_answers
        #   - tolerance
        #   - case_sensitive
        #   - input_mode
        #   - evaluation
        if isinstance(answer_config, AnswerConfig):
            answer_config = answer_config.model_dump()
        elif isinstance(answer_config, dict):
            answer_config = dict(answer_config)
        else:
            answer_config = {}

        legacy_answer = data.get("correct_answer")

        # Preserve legacy correct_answer support.
        if (
            "correct_answers" not in answer_config
            and legacy_answer is not None
        ):
            if isinstance(legacy_answer, list):
                answer_config["correct_answers"] = [
                    str(item)
                    for item in legacy_answer
                ]
            else:
                answer_config["correct_answers"] = [
                    str(legacy_answer)
                ]

        data["answer_config"] = answer_config

        # answer_config = data.get(
        #     "answer_config"
        # )

        # if not isinstance(
        #     answer_config,
        #     dict,
        # ):
        #     answer_config = {}

        # legacy_answer = data.get(
        #     "correct_answer"
        # )

        # if (
        #     "correct_answers" not in answer_config
        #     and legacy_answer is not None
        # ):

        #     if isinstance(
        #         legacy_answer,
        #         list,
        #     ):
        #         answer_config[
        #             "correct_answers"
        #         ] = [
        #             str(item)
        #             for item in legacy_answer
        #         ]
        #     else:
        #         answer_config[
        #             "correct_answers"
        #         ] = [
        #             str(legacy_answer)
        #         ]

        # data["answer_config"] = answer_config

        # --------------------------------------------------------------
        # Legacy scoring alias
        # --------------------------------------------------------------

        if (
            "marking" not in data
            and isinstance(
                data.get("scoring"),
                dict,
            )
        ):
            marking = dict(
                data["scoring"]
            )

            if (
                "incorrect" not in marking
                and "wrong" in marking
            ):
                marking["incorrect"] = marking.pop(
                    "wrong"
                )

            data["marking"] = marking

        return data

    # ------------------------------------------------------------------
    # Synchronize answer configuration
    # ------------------------------------------------------------------

    @model_validator(mode="after")
    def synchronize_answer_configuration(
        self,
    ):

        if (
            not self.answer_config.correct_answers
            and self.correct_answer
        ):
            self.answer_config.correct_answers = list(
                self.correct_answer
            )

        elif (
            self.answer_config.correct_answers
            and not self.correct_answer
        ):
            self.correct_answer = list(
                self.answer_config.correct_answers
            )

        return self

    # ------------------------------------------------------------------
    # Legacy image alias
    # ------------------------------------------------------------------

    @property
    def images(
        self,
    ) -> list[QuestionImage]:

        return self.question_images

    # ------------------------------------------------------------------
    # Normalize legacy correct answers
    # ------------------------------------------------------------------

    @field_validator("correct_answer")
    @classmethod
    def normalize_correct_answer(
        cls,
        value: list[str] | None,
    ) -> list[str] | None:

        if value is None:
            return None

        normalized = [
            item.strip().upper()
            for item in value
            if item and item.strip()
        ]

        return normalized or None


# ============================================================================
# QUESTION UPDATE
# ============================================================================


class QuestionUpdate(BaseModel):
    question_number: int | None = None

    section: str | None = None
    topic: str | None = None
    subtopic: str | None = None

    question_type: QuestionType | None = None

    question_text: str | None = None

    question_images: list[QuestionImage] | None = None

    # Legacy alias.
    images: list[QuestionImage] | None = None

    options: list[Option] | None = None

    correct_answer: list[str] | None = None

    answer_config: AnswerConfig | None = None

    marking: MarkingRule | QuestionMarking | None = None

    numerical_answer: NumericalAnswer | None = None

    explanation: Explanation | str | None = None

    difficulty: Difficulty | None = None

    source_page: int | None = None

    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )