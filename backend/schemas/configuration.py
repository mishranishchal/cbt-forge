# from enum import Enum

# from pydantic import BaseModel, Field, field_validator, model_validator


# class TimingMode(str, Enum):
#     single = "single"
#     section = "section"


# class QuestionSelectionMode(str, Enum):
#     automatic = "automatic"
#     manual = "manual"


# class MarkingScheme(BaseModel):
#     correct: float = 1
#     wrong: float = -0.25
#     unattempted: float = 0

#     @model_validator(mode="after")
#     def validate_marks(self) -> "MarkingScheme":
#         if self.correct < 0:
#             raise ValueError("Correct marks must be zero or positive.")
#         if self.wrong > 0:
#             raise ValueError("Wrong marks must be zero or negative.")
#         return self


# class TimingConfig(BaseModel):
#     mode: TimingMode = TimingMode.single
#     total_minutes: int = Field(default=60, ge=1)


# class NavigationConfig(BaseModel):
#     section_switching: bool = True
#     back_navigation: bool = True
#     previous_question: bool = True
#     next_question: bool = True
#     clear_response: bool = True
#     mark_for_review: bool = True
#     question_palette: bool = True


# class BehaviorConfig(BaseModel):
#     shuffle_questions: bool = False
#     shuffle_options: bool = False
#     auto_submit: bool = True


# class TestMetadata(BaseModel):
#     id: str
#     title: str = "Untitled CBT Forge Test"
#     description: str = ""
#     instructions: str = ""
#     timing: TimingConfig = Field(default_factory=TimingConfig)
#     navigation: NavigationConfig = Field(default_factory=NavigationConfig)
#     behavior: BehaviorConfig = Field(default_factory=BehaviorConfig)
#     global_marking: MarkingScheme = Field(default_factory=MarkingScheme)
#     use_global_marking: bool = True


# class TestSection(BaseModel):
#     id: str
#     name: str
#     description: str = ""
#     duration_minutes: int = Field(default=30, ge=1)
#     expected_question_count: int | None = Field(default=None, ge=0)
#     marking: MarkingScheme = Field(default_factory=MarkingScheme)
#     question_ids: list[str] = Field(default_factory=list)
#     selection_mode: QuestionSelectionMode = QuestionSelectionMode.automatic
#     allow_section_switching: bool = True

#     @field_validator("question_ids")
#     @classmethod
#     def unique_question_ids(cls, value: list[str]) -> list[str]:
#         seen: set[str] = set()
#         unique: list[str] = []
#         for question_id in value:
#             if question_id not in seen:
#                 seen.add(question_id)
#                 unique.append(question_id)
#         return unique


# class TestConfiguration(BaseModel):
#     test: TestMetadata
#     sections: list[TestSection] = Field(default_factory=list)


# class ConfigurationValidationResult(BaseModel):
#     valid: bool
#     errors: list[str] = Field(default_factory=list)
#     warnings: list[str] = Field(default_factory=list)


# class BulkQuestionUpdate(BaseModel):
#     question_ids: list[str]
#     section: str | None = None
#     topic: str | None = None
#     difficulty: str | None = None


# class ReorderQuestionsRequest(BaseModel):
#     test_id: str
#     question_ids: list[str]


from decimal import Decimal, InvalidOperation
from enum import Enum
from fractions import Fraction

from pydantic import BaseModel, Field, field_validator, model_validator


class TimingMode(str, Enum):
    single = "single"
    section = "section"


class QuestionSelectionMode(str, Enum):
    automatic = "automatic"
    manual = "manual"


def _validate_mark_value(value: str, field_name: str) -> str:
    """
    Validate and preserve a marking value exactly as entered.

    Supported:
        1
        1.5
        -0.25
        -0.33
        -1/3
        +2
        0

    Values remain strings so that:
        -0.33
    and:
        -1/3

    remain distinguishable in the configuration.
    """
    value = str(value).strip()

    if not value:
        raise ValueError(f"{field_name} cannot be empty.")

    # Fraction
    if "/" in value:
        parts = value.split("/")

        if len(parts) != 2:
            raise ValueError(
                f"{field_name} must be a valid integer, decimal, or fraction."
            )

        numerator_text = parts[0].strip()
        denominator_text = parts[1].strip()

        try:
            int(numerator_text)
            denominator = int(denominator_text)
        except ValueError as exc:
            raise ValueError(
                f"{field_name} must be a valid integer, decimal, or fraction."
            ) from exc

        if denominator == 0:
            raise ValueError(
                f"{field_name} cannot have a zero denominator."
            )

        return value

    # Decimal / integer
    try:
        Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(
            f"{field_name} must be a valid integer, decimal, or fraction "
            f"(examples: 1, 1.5, -0.33, -1/3)."
        ) from exc

    return value


def _mark_as_fraction(value: str) -> Fraction:
    """
    Convert a validated marking value to Fraction for exact arithmetic.
    """
    value = str(value).strip()

    if "/" in value:
        numerator, denominator = value.split("/", 1)
        return Fraction(
            int(numerator.strip()),
            int(denominator.strip()),
        )

    return Fraction(Decimal(value))


# class MarkingScheme(BaseModel):
#     """
#     Default marking scheme used at test or section level.

#     Values are strings to preserve exact user input.

#     Examples:
#         correct = "1"
#         wrong = "-0.33"
#         wrong = "-1/3"
#     """

#     correct: str = "1"
#     wrong: str = "-0.25"
#     unattempted: str = "0"

#     @field_validator("correct", "wrong", "unattempted")
#     @classmethod
#     def validate_marking_value(
#         cls,
#         value: str,
#         info,
#     ) -> str:
#         return _validate_mark_value(value, info.field_name)

#     @model_validator(mode="after")
#     def validate_marks(self) -> "MarkingScheme":
#         correct = _mark_as_fraction(self.correct)
#         wrong = _mark_as_fraction(self.wrong)

#         if correct < 0:
#             raise ValueError(
#                 "Correct marks must be zero or positive."
#             )

#         if wrong > 0:
#             raise ValueError(
#                 "Wrong marks must be zero or negative."
#             )

#         return self


class MarkingScheme(BaseModel):
    """
    Default marking scheme used at test or section level.

    Values accept both numeric and textual input.

    Examples:
        correct=1
        correct=1.5
        wrong=-0.25
        wrong="-0.33"
        wrong="-1/3"

    Internally the values are stored as strings so exact textual
    representations such as -0.33 and -1/3 are preserved.
    """

    correct: str = "1"
    wrong: str = "-0.25"
    unattempted: str = "0"

    @field_validator(
        "correct",
        "wrong",
        "unattempted",
        mode="before",
    )
    @classmethod
    def validate_marking_value(
        cls,
        value,
        info,
    ) -> str:
        """
        Accept int/float/string input.

        Pydantic's default strict string validation rejects:

            1
            -0.25
            1.5

        even though the existing application and tests use these
        numeric forms.

        Convert numeric values to strings before the actual
        validation while preserving strings exactly.
        """
        if value is None:
            raise ValueError(
                f"{info.field_name} cannot be empty."
            )

        if isinstance(value, bool):
            raise ValueError(
                f"{info.field_name} must be numeric."
            )

        if isinstance(value, str):
            text = value.strip()
        else:
            text = str(value)

        return _validate_mark_value(
            text,
            info.field_name,
        )

    @model_validator(mode="after")
    def validate_marks(self) -> "MarkingScheme":
        correct = _mark_as_fraction(
            self.correct
        )

        wrong = _mark_as_fraction(
            self.wrong
        )

        if correct < 0:
            raise ValueError(
                "Correct marks must be zero or positive."
            )

        if wrong > 0:
            raise ValueError(
                "Wrong marks must be zero or negative."
            )

        return self

class TimingConfig(BaseModel):
    mode: TimingMode = TimingMode.single
    total_minutes: int = Field(default=60, ge=1)


class NavigationConfig(BaseModel):
    section_switching: bool = True
    back_navigation: bool = True
    previous_question: bool = True
    next_question: bool = True
    clear_response: bool = True
    mark_for_review: bool = True
    question_palette: bool = True


class BehaviorConfig(BaseModel):
    shuffle_questions: bool = False
    shuffle_options: bool = False
    auto_submit: bool = True


class TestMetadata(BaseModel):
    id: str
    title: str = "Untitled CBT Forge Test"
    description: str = ""
    instructions: str = ""

    timing: TimingConfig = Field(
        default_factory=TimingConfig
    )

    navigation: NavigationConfig = Field(
        default_factory=NavigationConfig
    )

    behavior: BehaviorConfig = Field(
        default_factory=BehaviorConfig
    )

    global_marking: MarkingScheme = Field(
        default_factory=MarkingScheme
    )

    use_global_marking: bool = True


class TestSection(BaseModel):
    id: str
    name: str
    description: str = ""

    duration_minutes: int = Field(
        default=30,
        ge=1,
    )

    expected_question_count: int | None = Field(
        default=None,
        ge=0,
    )

    marking: MarkingScheme = Field(
        default_factory=MarkingScheme
    )

    question_ids: list[str] = Field(
        default_factory=list
    )

    selection_mode: QuestionSelectionMode = (
        QuestionSelectionMode.automatic
    )

    allow_section_switching: bool = True

    @field_validator("question_ids")
    @classmethod
    def unique_question_ids(
        cls,
        value: list[str],
    ) -> list[str]:
        seen: set[str] = set()
        unique: list[str] = []

        for question_id in value:
            if question_id not in seen:
                seen.add(question_id)
                unique.append(question_id)

        return unique


class TestConfiguration(BaseModel):
    test: TestMetadata

    sections: list[TestSection] = Field(
        default_factory=list
    )


class ConfigurationValidationResult(BaseModel):
    valid: bool
    errors: list[str] = Field(
        default_factory=list
    )
    warnings: list[str] = Field(
        default_factory=list
    )


class BulkQuestionUpdate(BaseModel):
    question_ids: list[str]

    section: str | None = None
    topic: str | None = None
    difficulty: str | None = None


class ReorderQuestionsRequest(BaseModel):
    test_id: str
    question_ids: list[str]