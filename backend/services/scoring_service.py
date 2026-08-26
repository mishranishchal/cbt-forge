from decimal import Decimal, InvalidOperation
from fractions import Fraction
from typing import Any

from schemas.configuration import MarkingScheme, TestConfiguration
from schemas.question import (
    AnswerInputMode,
    EvaluationMode,
    MarkingRule,
    Question,
    QuestionType,
)


# ---------------------------------------------------------------------------
# Numeric helpers
# ---------------------------------------------------------------------------


def parse_numeric(value: Any) -> Decimal | None:
    """
    Parse an integer/real-number response safely.

    Supports:
        10
        "10"
        "10.5"
        "-2.25"

    Fractions are also accepted for robustness:
        "1/3"
    """
    if value is None:
        return None

    if isinstance(value, bool):
        return None

    text = str(value).strip()

    if not text:
        return None

    try:
        if "/" in text:
            parts = text.split("/")

            if len(parts) != 2:
                return None

            numerator = Decimal(parts[0].strip())
            denominator = Decimal(parts[1].strip())

            if denominator == 0:
                return None

            return numerator / denominator

        return Decimal(text)

    except (InvalidOperation, ValueError, ZeroDivisionError):
        return None


def parse_fraction(value: str | int | float | Decimal) -> Fraction:
    """
    Convert a marking value to exact Fraction arithmetic.

    This keeps:
        -0.33
    distinct from:
        -1/3
    """
    text = str(value).strip()

    if "/" in text:
        numerator, denominator = text.split("/", 1)

        return Fraction(
            int(numerator.strip()),
            int(denominator.strip()),
        )

    return Fraction(Decimal(text))


def fraction_to_number(value: Fraction) -> int | float:
    """
    Convert an exact Fraction into a JSON-friendly number.

    Integer values remain ints.
    Non-integers become floats.
    """
    if value.denominator == 1:
        return value.numerator

    return float(value)


def marking_value(
    value: str,
) -> int | float:
    """
    Convert a marking string only at the final output boundary.

    The actual score calculation remains Fraction-based.
    """
    return fraction_to_number(parse_fraction(value))


# ---------------------------------------------------------------------------
# Marking resolution
# ---------------------------------------------------------------------------


def section_id_for_question(
    config: TestConfiguration,
    question_id: str,
) -> str | None:
    for section in config.sections:
        if question_id in section.question_ids:
            return section.id

    return None


def section_for_question(
    config: TestConfiguration,
    question: Question,
    section_id: str | None,
):
    """
    Resolve the section associated with a question.
    """
    if section_id:
        for section in config.sections:
            if section.id == section_id:
                return section

    for section in config.sections:
        if question.id in section.question_ids:
            return section

    return None


def marking_for_question(
    config: TestConfiguration,
    question: Question,
    section_id: str | None,
) -> MarkingScheme:
    """
    Resolve test/section-level marking.

    Priority:

        global marking
            OR
        section marking

    Question-level marking is handled separately by
    effective_question_marking().
    """
    if config.test.use_global_marking:
        return config.test.global_marking

    section = section_for_question(
        config,
        question,
        section_id,
    )

    if section is not None:
        return section.marking

    return config.test.global_marking


def _question_marking_is_override(
    question: Question,
) -> bool:
    """
    Determine whether the question contains an active
    question-level marking override.

    The new Question model already exposes:
        marking.override_default
    """
    marking = getattr(question, "marking", None)

    if marking is None:
        return False

    return bool(
        getattr(
            marking,
            "override_default",
            False,
        )
    )


def effective_question_marking(
    config: TestConfiguration,
    question: Question,
    section_id: str | None,
) -> MarkingRule | MarkingScheme:
    """
    Resolve the final marking rule for a question.

    Priority:

        1. Question-level marking when override_default=True
        2. Section/global marking otherwise
    """
    question_marking = getattr(
        question,
        "marking",
        None,
    )

    if (
        question_marking is not None
        and _question_marking_is_override(question)
    ):
        return question_marking

    return marking_for_question(
        config,
        question,
        section_id,
    )


# ---------------------------------------------------------------------------
# Marking extraction
# ---------------------------------------------------------------------------


def _correct_mark(
    marking: MarkingRule | MarkingScheme,
) -> str:
    return str(
        getattr(
            marking,
            "correct",
            "1",
        )
    )


def _incorrect_mark(
    marking: MarkingRule | MarkingScheme,
) -> str:
    """
    MarkingRule calls this field 'incorrect'.
    Legacy MarkingScheme calls it 'wrong'.
    """
    if hasattr(marking, "incorrect"):
        return str(marking.incorrect)

    return str(marking.wrong)


def _unattempted_mark(
    marking: MarkingRule | MarkingScheme,
) -> str:
    return str(
        getattr(
            marking,
            "unattempted",
            "0",
        )
    )


def _maximum_marks(
    marking: MarkingRule | MarkingScheme,
) -> str | None:
    value = getattr(
        marking,
        "maximum_marks",
        None,
    )

    if value is None:
        return None

    return str(value)


def question_maximum_marks(
    question: Question,
    marking: MarkingRule | MarkingScheme,
) -> Fraction:
    """
    Determine maximum marks for a question.

    If question-level maximum_marks exists, it takes precedence.

    Otherwise the positive correct mark is used.
    """
    explicit_maximum = _maximum_marks(marking)

    if explicit_maximum is not None:
        return parse_marking_fraction(
            explicit_maximum
        )

    return parse_marking_fraction(
        _correct_mark(marking)
    )


def parse_marking_fraction(
    value: str | int | float | Decimal,
) -> Fraction:
    return parse_fraction(value)


# ---------------------------------------------------------------------------
# Answer normalization
# ---------------------------------------------------------------------------


def normalize_answers(
    values: list[Any] | None,
) -> list[str]:
    """
    Legacy answer normalization.

    Used for option-based questions.
    """
    result: list[str] = []

    for item in values or []:
        if item is None:
            continue

        text = str(item).strip()

        if text:
            result.append(text.upper())

    return sorted(set(result))


def normalize_text(
    value: Any,
    case_sensitive: bool = False,
) -> str:
    if value is None:
        return ""

    text = str(value).strip()

    if not case_sensitive:
        text = text.casefold()

    return text


def normalize_text_answers(
    values: list[Any],
    case_sensitive: bool = False,
) -> list[str]:
    result: list[str] = []

    for value in values:
        text = normalize_text(
            value,
            case_sensitive,
        )

        if text:
            result.append(text)

    return result


# ---------------------------------------------------------------------------
# Runtime status
# ---------------------------------------------------------------------------


def derive_runtime_status(
    visited: bool,
    selected_answers: list[str],
    marked_for_review: bool,
    numeric_value: str | None = None,
    text_answer: str | None = None,
) -> str:
    selected = normalize_answers(
        selected_answers
    )

    has_typed_answer = bool(str(numeric_value or "").strip() or str(text_answer or "").strip())
    if (
        not visited
        and not selected
        and not has_typed_answer
        and not marked_for_review
    ):
        return "NOT_VISITED"

    if marked_for_review and (selected or has_typed_answer):
        return "ANSWERED_AND_MARKED"

    if marked_for_review:
        return "MARKED_FOR_REVIEW"

    if selected or has_typed_answer:
        return "ANSWERED"

    return "NOT_ANSWERED"


# ---------------------------------------------------------------------------
# Question answer extraction
# ---------------------------------------------------------------------------


def extract_response_values(
    response: dict[str, Any],
) -> list[str]:
    """
    Read the existing response format while also accepting
    future numerical/text response fields.

    Supported:

        selected_answers: [...]
        answer: value
        value: value
        response: value
        selected_answer: value
    """
    numeric_value = response.get("numeric_value")
    if numeric_value is not None and str(numeric_value).strip():
        return [str(numeric_value)]
    text_answer = response.get("text_answer")
    if text_answer is not None and str(text_answer).strip():
        return [str(text_answer)]
    selected = response.get(
        "selected_answers"
    )

    if selected is not None:
        if isinstance(selected, list):
            return [
                str(item)
                for item in selected
                if item is not None
            ]

        return [str(selected)]

    for key in (
        "answer",
        "value",
        "response",
        "selected_answer",
        "answer_value",
    ):
        value = response.get(key)

        if value is None:
            continue

        if isinstance(value, list):
            return [
                str(item)
                for item in value
                if item is not None
            ]

        return [str(value)]

    return []


# ---------------------------------------------------------------------------
# Answer configuration helpers
# ---------------------------------------------------------------------------


def answer_config_for(
    question: Question,
):
    return getattr(
        question,
        "answer_config",
        None,
    )


def answer_config_value(question: Question, field_name: str, default: Any = None) -> Any:
    """Read an AnswerConfig value robustly across Pydantic/model variants."""
    answer_config = answer_config_for(question)
    if answer_config is None:
        return default

    value = getattr(answer_config, field_name, None)
    if value is not None:
        return value

    if isinstance(answer_config, dict):
        return answer_config.get(field_name, default)

    try:
        dumped = answer_config.model_dump()
    except AttributeError:
        try:
            dumped = answer_config.dict()
        except AttributeError:
            dumped = None

    if isinstance(dumped, dict):
        return dumped.get(field_name, default)

    return default


def configured_correct_answers(
    question: Question,
) -> list[str]:
    values = answer_config_value(question, "correct_answers", None)
    if values:
        return [str(value) for value in values]

    legacy = getattr(question, "correct_answer", None) or []
    return [str(value) for value in legacy]


def configured_accepted_answers(
    question: Question,
) -> list[str]:
    values = answer_config_value(question, "accepted_answers", None)
    return [str(value) for value in (values or [])]


# ---------------------------------------------------------------------------
# Automatic answer evaluation
# ---------------------------------------------------------------------------


def evaluate_single_choice(
    question: Question,
    selected: list[str],
) -> bool:
    correct = normalize_answers(
        configured_correct_answers(question)
    )

    selected_normalized = normalize_answers(
        selected
    )

    return (
        len(selected_normalized) == 1
        and selected_normalized == correct
    )


def evaluate_multiple_select(
    question: Question,
    selected: list[str],
) -> bool:
    correct = normalize_answers(
        configured_correct_answers(question)
    )

    selected_normalized = normalize_answers(
        selected
    )

    return selected_normalized == correct


def evaluate_true_false(
    question: Question,
    selected: list[str],
) -> bool:
    if not selected:
        return False

    candidate = normalize_text(
        selected[0]
    )

    aliases = {
        "true": "true",
        "t": "true",
        "1": "true",
        "yes": "true",
        "false": "false",
        "f": "false",
        "0": "false",
        "no": "false",
    }

    normalized_candidate = aliases.get(
        candidate,
        candidate,
    )

    correct_answers = configured_correct_answers(
        question
    )

    if not correct_answers:
        return False

    normalized_correct = aliases.get(
        normalize_text(correct_answers[0]),
        normalize_text(correct_answers[0]),
    )

    return normalized_candidate == normalized_correct


def evaluate_numeric_exact(
    question: Question,
    selected: list[str],
) -> bool:
    if not selected:
        return False

    candidate = parse_numeric(
        selected[0]
    )

    if candidate is None:
        return False

    correct_answers = configured_correct_answers(
        question
    )

    if not correct_answers:
        return False

    for correct_value in correct_answers:
        expected = parse_numeric(
            correct_value
        )

        if expected is not None and candidate == expected:
            return True

    return False


def evaluate_numerical_tolerance(
    question: Question,
    selected: list[str],
) -> bool:
    if not selected:
        return False

    candidate = parse_numeric(selected[0])
    if candidate is None:
        return False

    tolerance_value = answer_config_value(question, "tolerance", None)

    if tolerance_value is None:
        numerical_answer = getattr(question, "numerical_answer", None)
        if numerical_answer is not None:
            tolerance_value = getattr(numerical_answer, "tolerance", None)

    if tolerance_value is None:
        return evaluate_numeric_exact(question, selected)

    tolerance = parse_numeric(tolerance_value)
    if tolerance is None or tolerance < 0:
        return False

    for correct_value in configured_correct_answers(question):
        expected = parse_numeric(correct_value)
        if expected is not None and abs(candidate - expected) <= tolerance:
            return True

    return False


def evaluate_short_answer(
    question: Question,
    selected: list[str],
) -> bool:
    if not selected:
        return False

    case_sensitive = bool(
        answer_config_value(question, "case_sensitive", False)
    )

    accepted = (
        configured_correct_answers(question)
        + configured_accepted_answers(question)
    )

    candidate = normalize_text(selected[0], case_sensitive)

    return any(
        candidate == normalize_text(answer, case_sensitive)
        for answer in accepted
    )


def question_requires_manual_evaluation(
    question: Question,
) -> bool:
    answer_config = answer_config_for(
        question
    )

    if answer_config is not None:
        evaluation = getattr(
            answer_config,
            "evaluation",
            EvaluationMode.automatic,
        )

        if evaluation == EvaluationMode.manual:
            return True

    return question.question_type == QuestionType.long_answer


def evaluate_question_answer(
    question: Question,
    selected: list[str],
) -> tuple[str, bool | None]:
    """
    Return:

        ("correct", True)
        ("wrong", False)
        ("manual", None)
    """
    if question_requires_manual_evaluation(
        question
    ):
        return "manual", None

    question_type = question.question_type

    if question_type == QuestionType.single_choice:
        correct = evaluate_single_choice(
            question,
            selected,
        )
        return (
            "correct" if correct else "wrong",
            correct,
        )

    if question_type == QuestionType.multiple_choice:
        correct = evaluate_multiple_select(
            question,
            selected,
        )
        return (
            "correct" if correct else "wrong",
            correct,
        )

    if question_type == QuestionType.multiple_select:
        correct = evaluate_multiple_select(
            question,
            selected,
        )
        return (
            "correct" if correct else "wrong",
            correct,
        )

    if question_type == QuestionType.true_false:
        correct = evaluate_true_false(
            question,
            selected,
        )
        return (
            "correct" if correct else "wrong",
            correct,
        )

    if question_type == QuestionType.integer:
        correct = evaluate_numeric_exact(
            question,
            selected,
        )
        return (
            "correct" if correct else "wrong",
            correct,
        )

    if question_type == QuestionType.real_number:
        correct = evaluate_numeric_exact(
            question,
            selected,
        )
        return (
            "correct" if correct else "wrong",
            correct,
        )

    if question_type == QuestionType.numerical_tolerance:
        correct = evaluate_numerical_tolerance(
            question,
            selected,
        )
        return (
            "correct" if correct else "wrong",
            correct,
        )

    if question_type == QuestionType.short_answer:
        correct = evaluate_short_answer(
            question,
            selected,
        )
        return (
            "correct" if correct else "wrong",
            correct,
        )

    if question_type == QuestionType.long_answer:
        return "manual", None

    if question_type == QuestionType.image_based:
        # Legacy image-based questions still use answer comparison
        # when an answer has been supplied.
        correct = evaluate_multiple_select(
            question,
            selected,
        )
        return (
            "correct" if correct else "wrong",
            correct,
        )

    # Backward-compatible fallback.
    correct = evaluate_multiple_select(
        question,
        selected,
    )

    return (
        "correct" if correct else "wrong",
        correct,
    )


# ---------------------------------------------------------------------------
# Individual question scoring
# ---------------------------------------------------------------------------


def score_question(
    question: Question,
    selected_answers: list[str] | None,
    marking: MarkingRule | MarkingScheme,
    multiple_correct_mode: str = "exact",
) -> dict[str, Any]:
    """
    Score a single question.

    Supports:

        single_choice
        multiple_choice
        multiple_select
        true_false
        integer
        real_number
        numerical_tolerance
        short_answer
        long_answer
        image_based

    Long/manual questions are returned as 'manual' and receive
    zero automatic marks until manually evaluated.
    """
    selected = [
        str(item)
        for item in (
            selected_answers
            or []
        )
        if item is not None
        and str(item).strip()
    ]

    correct_values = configured_correct_answers(
        question
    )

    attempted = bool(selected)

    correct_display = normalize_answers(
        correct_values
    )

    if not attempted:
        unattempted_marks = parse_marking_fraction(
            _unattempted_mark(marking)
        )

        return {
            "status": "unattempted",
            "marks": fraction_to_number(
                unattempted_marks
            ),
            "selected_answers": selected,
            "correct_answer": correct_display,
            "is_correct": False,
            "evaluation": "automatic",
        }

    evaluation_status, is_correct = (
        evaluate_question_answer(
            question,
            selected,
        )
    )

    # ---------------------------------------------------------------
    # Manual evaluation
    # ---------------------------------------------------------------
    if evaluation_status == "manual":
        return {
            "status": "manual",
            "marks": 0,
            "selected_answers": selected,
            "correct_answer": correct_display,
            "is_correct": None,
            "evaluation": "manual",
        }

    # ---------------------------------------------------------------
    # Partial marking for legacy multiple_choice
    # ---------------------------------------------------------------
    if (
        question.question_type
        == QuestionType.multiple_choice
        and multiple_correct_mode == "partial"
        and correct_values
    ):
        selected_normalized = set(
            normalize_answers(selected)
        )

        correct_normalized = set(
            normalize_answers(correct_values)
        )

        matched = len(
            selected_normalized
            & correct_normalized
        )

        extra = len(
            selected_normalized
            - correct_normalized
        )

        correct_marks = parse_marking_fraction(
            _correct_mark(marking)
        )

        wrong_marks = parse_marking_fraction(
            _incorrect_mark(marking)
        )

        if extra:
            return {
                "status": "wrong",
                "marks": fraction_to_number(
                    wrong_marks
                ),
                "selected_answers": selected,
                "correct_answer": correct_display,
                "is_correct": False,
                "evaluation": "automatic",
            }

        if matched == len(correct_normalized):
            return {
                "status": "correct",
                "marks": fraction_to_number(
                    correct_marks
                ),
                "selected_answers": selected,
                "correct_answer": correct_display,
                "is_correct": True,
                "evaluation": "automatic",
            }

        partial = (
            correct_marks
            * Fraction(
                matched,
                len(correct_normalized),
            )
        )

        return {
            "status": "wrong",
            "marks": fraction_to_number(
                partial
            ),
            "selected_answers": selected,
            "correct_answer": correct_display,
            "is_correct": False,
            "evaluation": "automatic",
        }

    # ---------------------------------------------------------------
    # Normal automatic marking
    # ---------------------------------------------------------------
    if is_correct:
        marks = parse_marking_fraction(
            _correct_mark(marking)
        )

        return {
            "status": "correct",
            "marks": fraction_to_number(
                marks
            ),
            "selected_answers": selected,
            "correct_answer": correct_display,
            "is_correct": True,
            "evaluation": "automatic",
        }

    marks = parse_marking_fraction(
        _incorrect_mark(marking)
    )

    return {
        "status": "wrong",
        "marks": fraction_to_number(
            marks
        ),
        "selected_answers": selected,
        "correct_answer": correct_display,
        "is_correct": False,
        "evaluation": "automatic",
    }


# ---------------------------------------------------------------------------
# Attempt scoring
# ---------------------------------------------------------------------------


def score_attempt(
    config: TestConfiguration,
    questions: list[Question],
    responses: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """
    Score an entire attempt.

    Question ordering:
        1. Configuration section order
        2. Remaining questions

    Maximum score:
        Calculated individually for every question.

    This means questions can have different weights.
    """
    question_by_id = {
        question.id: question
        for question in questions
    }

    ordered_ids: list[str] = []

    for section in config.sections:
        for question_id in section.question_ids:
            if (
                question_id in question_by_id
                and question_id not in ordered_ids
            ):
                ordered_ids.append(
                    question_id
                )

    for question in questions:
        if question.id not in ordered_ids:
            ordered_ids.append(
                question.id
            )

    details: list[dict[str, Any]] = []

    total_score = Fraction(0)
    maximum_score = Fraction(0)

    attempted = 0
    correct = 0
    wrong = 0
    unattempted = 0
    manual = 0

    for question_id in ordered_ids:
        question = question_by_id[
            question_id
        ]

        section_id = section_id_for_question(
            config,
            question_id,
        )

        marking = effective_question_marking(
            config,
            question,
            section_id,
        )

        # -----------------------------------------------------------
        # Maximum score
        # -----------------------------------------------------------
        question_maximum = (
            question_maximum_marks(
                question,
                marking,
            )
        )

        maximum_score += question_maximum

        # -----------------------------------------------------------
        # Response
        # -----------------------------------------------------------
        response = responses.get(
            question_id,
            {},
        )

        if not isinstance(response, dict):
            response = {}

        selected = extract_response_values(
            response
        )

        scored = score_question(
            question,
            selected,
            marking,
        )

        question_marks = parse_numeric(
            scored.get("marks")
        )

        if question_marks is None:
            question_marks = Decimal("0")

        # Decimal -> Fraction for exact aggregate arithmetic.
        question_score_fraction = (
            Fraction(question_marks)
        )

        total_score += (
            question_score_fraction
        )

        # -----------------------------------------------------------
        # Statistics
        # -----------------------------------------------------------
        status = scored["status"]

        if status == "unattempted":
            unattempted += 1

        elif status == "manual":
            manual += 1
            attempted += 1

        else:
            attempted += 1

            if scored["is_correct"]:
                correct += 1
            else:
                wrong += 1

        # -----------------------------------------------------------
        # Runtime information
        # -----------------------------------------------------------
        visited = bool(
            response.get("visited")
        )

        marked_for_review = bool(
            response.get(
                "marked_for_review"
            )
        )

        runtime_status = (
            response.get("status")
            or derive_runtime_status(
                visited,
                selected,
                marked_for_review,
                response.get("numeric_value"),
                response.get("text_answer"),
            )
        )

        difficulty = question.difficulty

        if hasattr(
            difficulty,
            "value",
        ):
            difficulty = difficulty.value

        details.append(
            {
                "question_id": question_id,
                "section_id": section_id,
                "topic": question.topic,
                "subtopic": question.subtopic,
                "difficulty": difficulty,
                "question_number": question.question_number,

                "time_spent_seconds": int(
                    response.get(
                        "time_spent_seconds",
                        0,
                    )
                    or 0
                ),

                "visited": visited,
                "marked_for_review": marked_for_review,
                "runtime_status": runtime_status,

                "selected_answers": scored[
                    "selected_answers"
                ],

                "correct_answer": scored[
                    "correct_answer"
                ],

                "status": status,
                "marks": scored["marks"],
                "is_correct": scored[
                    "is_correct"
                ],

                "evaluation": scored.get(
                    "evaluation",
                    "automatic",
                ),

                "maximum_marks": fraction_to_number(
                    question_maximum
                ),
            }
        )

    # -------------------------------------------------------------------
    # Aggregate values
    # -------------------------------------------------------------------

    score_number = fraction_to_number(
        total_score
    )

    maximum_number = fraction_to_number(
        maximum_score
    )

    accuracy = (
        (correct / attempted) * 100
        if attempted
        else 0.0
    )

    percentage = (
        (float(total_score)
         / float(maximum_score))
        * 100
        if maximum_score
        else 0.0
    )

    return {
        "score": score_number,
        "maximum_score": maximum_number,
        "percentage": percentage,

        "attempted": attempted,
        "correct": correct,
        "wrong": wrong,
        "unattempted": unattempted,
        "manual": manual,

        "accuracy": accuracy,
        "total_questions": len(
            ordered_ids
        ),

        "question_results": details,
    }


# ---------------------------------------------------------------------------
# Display helper
# ---------------------------------------------------------------------------


def display_number(
    value: int | float | Decimal | Fraction,
) -> float:
    """
    Backward-compatible display helper.
    """
    return round(
        float(value),
        2,
    )
