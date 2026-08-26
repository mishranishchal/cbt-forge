import re
from typing import Any

from schemas.question import (
    Difficulty,
    Explanation,
    NumericalAnswer,
    Option,
    Question,
    QuestionImage,
    QuestionMarking,
    QuestionType,
)


# ============================================================================
# BASIC HELPERS
# ============================================================================


def _clean(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()

    return text or None


class PathLike:
    @staticmethod
    def safe(value: str) -> str:
        return re.sub(
            r"[^A-Za-z0-9_.-]",
            "_",
            value,
        )


# ============================================================================
# IMAGE NORMALIZATION
# ============================================================================


def _assets(
    value: Any,
    asset_index: dict[str, object] | None,
    warnings: list[str],
    source_page: int | None = None,
) -> list[QuestionImage]:

    result: list[QuestionImage] = []

    for item in value or []:

        # --------------------------------------------------------------
        # String shorthand
        # --------------------------------------------------------------

        if isinstance(item, str):
            item = {
                "filename": item,
            }

        if not isinstance(item, dict):
            warnings.append(
                "Image reference is invalid."
            )
            continue

        filename = _clean(
            item.get("filename")
        )

        path = _clean(
            item.get("path")
        )

        # --------------------------------------------------------------
        # Resolve from asset index
        # --------------------------------------------------------------

        resolved = (
            asset_index.get(
                filename.casefold()
            )
            if filename and asset_index
            else None
        )

        if isinstance(
            resolved,
            QuestionImage,
        ):

            asset = resolved.model_copy(
                deep=True
            )

            if item.get("alt_text"):
                asset.alt_text = _clean(
                    item.get("alt_text")
                )

            result.append(asset)
            continue

        # --------------------------------------------------------------
        # Filename-only reference
        #
        # This is a warning rather than an error.
        # --------------------------------------------------------------

        if not path:

            if filename:

                warnings.append(
                    f"Referenced image not found: {filename}"
                )

                path = (
                    "uploads/images/missing/"
                    f"{PathLike.safe(filename)}"
                )

            else:

                warnings.append(
                    "Image reference has no path or filename."
                )

                continue

        # --------------------------------------------------------------
        # Build image object
        # --------------------------------------------------------------

        result.append(
            QuestionImage(
                id=_clean(
                    item.get("id")
                ),
                path=path,
                filename=filename,
                mime_type=_clean(
                    item.get("mime_type")
                ),
                alt_text=_clean(
                    item.get("alt_text")
                ),
                width=item.get("width"),
                height=item.get("height"),
                page_number=item.get(
                    "page_number",
                    source_page,
                ),
            )
        )

    return result


# ============================================================================
# OPTIONS
# ============================================================================


def normalize_options(
    value: Any,
    asset_index: dict[str, object] | None = None,
    warnings: list[str] | None = None,
) -> list[Option]:

    warnings = (
        warnings
        if warnings is not None
        else []
    )

    items: list[
        tuple[str | None, Any, Any]
    ] = []

    # --------------------------------------------------------------
    # Dictionary form
    #
    # {
    #   "A": "Option A",
    #   "B": "Option B"
    # }
    # --------------------------------------------------------------

    if isinstance(
        value,
        dict,
    ):

        items = [
            (
                str(key),
                item,
                [],
            )
            for key, item in value.items()
        ]

    # --------------------------------------------------------------
    # List form
    # --------------------------------------------------------------

    elif isinstance(
        value,
        list,
    ):

        for item in value:

            if isinstance(
                item,
                dict,
            ):

                items.append(
                    (
                        _clean(
                            item.get("id")
                            or item.get("key")
                            or item.get("label")
                        ),
                        item.get("text")
                        or item.get("value")
                        or item.get("option")
                        or "",
                        item.get(
                            "images",
                            [],
                        ),
                    )
                )

            else:

                items.append(
                    (
                        None,
                        item,
                        [],
                    )
                )

    # --------------------------------------------------------------
    # Normalize
    # --------------------------------------------------------------

    normalized: list[Option] = []

    used: set[str] = set()

    for index, (
        option_id,
        text,
        images,
    ) in enumerate(items):

        option_id = (
            option_id
            or chr(65 + index)
        ).strip().upper()

        text_value = (
            _clean(text)
            or ""
        )

        if (
            not re.fullmatch(
                r"[A-Z0-9]{1,8}",
                option_id,
            )
            or option_id in used
        ):
            option_id = chr(
                65 + index
            )

        used.add(option_id)

        normalized.append(
            Option(
                id=option_id,
                text=text_value,
                images=_assets(
                    images,
                    asset_index,
                    warnings,
                ),
            )
        )

    return normalized


# ============================================================================
# ANSWER NORMALIZATION FOR CHOICE QUESTIONS
# ============================================================================


def normalize_answer(
    value: Any,
    options: list[Option],
) -> tuple[
    list[str] | None,
    str | None,
]:

    if value is None or value == "":
        return None, None

    values = (
        value
        if isinstance(value, list)
        else re.split(
            r"\s*[,/;]\s*",
            str(value),
        )
    )

    by_id = {
        option.id.upper(): option.id
        for option in options
    }

    by_text: dict[
        str,
        list[str],
    ] = {}

    for option in options:

        if option.text:

            by_text.setdefault(
                option.text.strip().casefold(),
                [],
            ).append(
                option.id
            )

    result: list[str] = []

    for item in values:

        candidate = _clean(item)

        if not candidate:
            continue

        upper = candidate.upper()

        option_match = re.fullmatch(
            r"(?:OPTION|CHOICE)\s*([A-Z0-9]+)",
            upper,
        )

        if option_match:
            upper = option_match.group(1)

        # Option ID
        if upper in by_id:

            result.append(
                by_id[upper]
            )

        # Option number
        elif (
            upper.isdigit()
            and 1 <= int(upper) <= len(options)
        ):

            result.append(
                options[
                    int(upper) - 1
                ].id
            )

        # Exact option text
        elif (
            len(
                by_text.get(
                    candidate.casefold(),
                    [],
                )
            )
            == 1
        ):

            result.append(
                by_text[
                    candidate.casefold()
                ][0]
            )

        else:

            return (
                None,
                "Correct answer is ambiguous or does not match an option.",
            )

    return (
        sorted(set(result))
        or None,
        None,
    )


# ============================================================================
# QUESTION TYPE
# ============================================================================


def normalize_question_type(
    value: Any,
    options: list[Option],
    answer: list[str] | None,
) -> str:

    # --------------------------------------------------------------
    # Infer type when not supplied
    # --------------------------------------------------------------

    if value is None:

        return (
            "multiple_select"
            if answer and len(answer) > 1
            else "single_choice"
            if len(options) >= 2
            else "unknown"
        )

    raw = str(value).strip().lower()

    aliases = {

        # Choice
        "mcq": "single_choice",
        "single": "single_choice",
        "single_choice": "single_choice",

        # Multiple choice / select
        "multiple": "multiple_select",
        "multi": "multiple_select",
        "multiple_choice": "multiple_choice",
        "multiple_select": "multiple_select",
        "msq": "multiple_select",

        # Boolean
        "true_false": "true_false",
        "true/false": "true_false",
        "boolean": "true_false",

        # Image
        "image": "image_based",
        "image_based": "image_based",

        # Integer
        "integer": "integer",
        "int": "integer",
        "integer_type": "integer",
        "numerical_integer": "integer",

        # Real
        "real": "real_number",
        "real_number": "real_number",
        "decimal": "real_number",
        "float": "real_number",
        "numeric": "real_number",
        "numerical": "real_number",

        # Numerical tolerance
        "numerical_tolerance": "numerical_tolerance",
        "numeric_tolerance": "numerical_tolerance",

        # Short answer
        "short_answer": "short_answer",
        "short": "short_answer",

        # Long answer
        "long_answer": "long_answer",
        "long_answer_type": "long_answer",
        "descriptive": "long_answer",
        "subjective": "long_answer",
        "essay": "long_answer",

        "unknown": "unknown",
    }

    normalized = aliases.get(raw)

    if normalized:
        return normalized

    if raw in {
        item.value
        for item in QuestionType
    }:
        return raw

    return (
        "multiple_select"
        if answer and len(answer) > 1
        else "single_choice"
        if len(options) >= 2
        else "unknown"
    )


# ============================================================================
# PER-QUESTION MARKING
# ============================================================================


def normalize_marking(
    value: Any,
    warnings: list[str],
) -> QuestionMarking | None:

    if value is None:
        return None

    if isinstance(
        value,
        QuestionMarking,
    ):
        return value

    if not isinstance(
        value,
        dict,
    ):

        warnings.append(
            "Question marking must be an object."
        )

        return None

    try:

        return QuestionMarking(
            correct=value.get(
                "correct",
                "1",
            ),
            wrong=value.get(
                "wrong",
                value.get(
                    "incorrect",
                    "0",
                ),
            ),
            unattempted=value.get(
                "unattempted",
                "0",
            ),
            maximum_marks=value.get(
                "maximum_marks"
            ),
            override_default=value.get(
                "override_default",
                False,
            ),
        )

    except ValueError as exc:

        warnings.append(
            f"Question marking is invalid: {exc}"
        )

        return None


# ============================================================================
# NUMERICAL ANSWER
# ============================================================================


def normalize_numerical_answer(
    value: Any,
    warnings: list[str],
) -> NumericalAnswer | None:

    if value is None:
        return None

    if isinstance(
        value,
        NumericalAnswer,
    ):
        return value

    try:

        if isinstance(
            value,
            dict,
        ):

            return NumericalAnswer(
                value=value.get(
                    "value"
                ),
                tolerance=value.get(
                    "tolerance",
                    "0",
                ),
                allow_integer=value.get(
                    "allow_integer",
                    True,
                ),
                allow_decimal=value.get(
                    "allow_decimal",
                    True,
                ),
            )

        return NumericalAnswer(
            value=value
        )

    except ValueError as exc:

        warnings.append(
            f"Numerical answer is invalid: {exc}"
        )

        return None


# ============================================================================
# QUESTION NORMALIZATION
# ============================================================================


def normalize_question(
    data: dict[str, Any],
    index: int,
    source_page: int | None = None,
    asset_index: dict[str, object] | None = None,
) -> Question:

    warnings = [
        str(item)
        for item in data.get(
            "warnings",
            [],
        )
        if str(item).strip()
    ]

    # --------------------------------------------------------------
    # Options
    # --------------------------------------------------------------

    options = normalize_options(
        data.get(
            "options",
            data.get(
                "choices",
                [],
            ),
        ),
        asset_index,
        warnings,
    )

    # --------------------------------------------------------------
    # Raw answer
    # --------------------------------------------------------------

    raw_answer = data.get(
        "correct_answer",
        data.get(
            "correctOption",
            data.get(
                "answer",
                data.get(
                    "answers"
                ),
            ),
        ),
    )

    # --------------------------------------------------------------
    # Determine question type
    # --------------------------------------------------------------

    raw_type = data.get(
        "question_type",
        data.get(
            "type"
        ),
    )

    raw_type = normalize_question_type(
        raw_type,
        options,
        None,
    )

    # --------------------------------------------------------------
    # Choice answer
    # --------------------------------------------------------------

    answer: list[str] | None = None

    answer_warning: str | None = None

    if raw_type in {
        "single_choice",
        "multiple_choice",
        "multiple_select",
        "true_false",
        "image_based",
    }:

        answer, answer_warning = normalize_answer(
            raw_answer,
            options,
        )

        if answer_warning:
            warnings.append(
                answer_warning
            )

        # If the input was an unspecified type and the answer has
        # multiple choices, normalize to multiple_select.
        if (
            raw_type == "multiple_choice"
            and answer
            and len(answer) > 1
        ):
            raw_type = "multiple_select"

    # --------------------------------------------------------------
    # Numerical answer
    # --------------------------------------------------------------

    numerical_source = data.get(
        "numerical_answer"
    )

    if numerical_source is None:
        numerical_source = data.get(
            "numeric_answer"
        )

    if numerical_source is None:
        numerical_source = data.get(
            "answer_value"
        )

    # Example:
    #
    # {
    #   "question_type": "integer",
    #   "answer": 42
    # }
    #

    if (
        raw_type
        in {
            "integer",
            "real_number",
            "numerical_tolerance",
        }
        and numerical_source is None
        and raw_answer is not None
    ):
        numerical_source = raw_answer

    numerical_answer = (
        normalize_numerical_answer(
            numerical_source,
            warnings,
        )
        if raw_type
        in {
            "integer",
            "real_number",
            "numerical_tolerance",
        }
        else None
    )

    # --------------------------------------------------------------
    # Descriptive / short answers
    # --------------------------------------------------------------

    if (
        raw_type
        in {
            "short_answer",
            "long_answer",
        }
        and raw_answer is not None
    ):

        if isinstance(
            raw_answer,
            list,
        ):

            answer = [
                str(item).strip()
                for item in raw_answer
                if str(item).strip()
            ]

        else:

            answer = [
                str(raw_answer).strip()
            ]

        answer = answer or None

    # --------------------------------------------------------------
    # Difficulty
    # --------------------------------------------------------------

    raw_difficulty = str(
        data.get(
            "difficulty",
            "unknown",
        )
        or "unknown"
    ).lower()

    if raw_difficulty not in {
        item.value
        for item in Difficulty
    }:

        warnings.append(
            "Difficulty is unrecognized."
        )

        raw_difficulty = "unknown"

    # --------------------------------------------------------------
    # Images
    # --------------------------------------------------------------

    question_images = _assets(
        data.get(
            "question_images",
            data.get(
                "images",
                [],
            ),
        ),
        asset_index,
        warnings,
        source_page,
    )

    # --------------------------------------------------------------
    # Explanation
    # --------------------------------------------------------------

    raw_explanation = data.get(
        "explanation"
    )

    if isinstance(
        raw_explanation,
        str,
    ):

        explanation = Explanation(
            text=_clean(
                raw_explanation
            ),
            images=[],
        )

    elif isinstance(
        raw_explanation,
        dict,
    ):

        explanation = Explanation(
            text=_clean(
                raw_explanation.get(
                    "text"
                )
            ),
            images=_assets(
                raw_explanation.get(
                    "images",
                    [],
                ),
                asset_index,
                warnings,
                source_page,
            ),
        )

    else:

        explanation = None

    # --------------------------------------------------------------
    # Question number
    # --------------------------------------------------------------

    number = data.get(
        "question_number",
        data.get(
            "number"
        ),
    )

    try:

        number = (
            int(number)
            if number is not None
            else index
        )

    except (
        TypeError,
        ValueError,
    ):

        warnings.append(
            "Question number is invalid."
        )

        number = None

    # --------------------------------------------------------------
    # Confidence
    # --------------------------------------------------------------

    try:

        confidence = min(
            1.0,
            max(
                0.0,
                float(
                    data.get(
                        "confidence",
                        1.0,
                    )
                ),
            ),
        )

    except (
        TypeError,
        ValueError,
    ):

        warnings.append(
            "Confidence is invalid."
        )

        confidence = 0.0

    # --------------------------------------------------------------
    # Per-question marking
    # --------------------------------------------------------------

    marking = normalize_marking(
        data.get(
            "marking"
        ),
        warnings,
    )

    # Direct scoring alias
    if marking is None:

        marking = normalize_marking(
            data.get(
                "scoring"
            ),
            warnings,
        )

    # --------------------------------------------------------------
    # Final Question
    # --------------------------------------------------------------

    question_data: dict[str, Any] = {
        "id": str(
            data.get(
                "id"
            )
            or f"q{index:03d}"
        ),

        "question_number": number,

        "section": _clean(
            data.get(
                "section"
            )
        ),

        "topic": _clean(
            data.get(
                "topic"
            )
        ),

        "subtopic": _clean(
            data.get(
                "subtopic"
            )
        ),

        "question_type": raw_type,

        "question_text": _clean(
            data.get(
                "question_text",
                data.get(
                    "stem",
                    data.get(
                        "question"
                    ),
                ),
            )
        )
        or "",

        "question_images": question_images,

        "options": options,

        "correct_answer": answer,

        "explanation": explanation,

        "difficulty": raw_difficulty,

        "source_page": source_page,

        "confidence": confidence,

        "warnings": warnings,
    }

    # --------------------------------------------------------------
    # Marking
    #
    # Convert legacy QuestionMarking -> current MarkingRule through
    # the Question model's compatibility validator.
    # --------------------------------------------------------------

    if marking is not None:
        question_data["marking"] = marking.model_dump()

    # --------------------------------------------------------------
    # Numerical answer
    # --------------------------------------------------------------

    if numerical_answer is not None:
        question_data[
            "numerical_answer"
        ] = numerical_answer

    return Question(
        **question_data
    )


# ============================================================================
# MULTIPLE QUESTIONS
# ============================================================================


def normalize_questions(
    items: list[dict[str, Any]],
    source_page: int | None = None,
    asset_index: dict[str, object] | None = None,
) -> list[Question]:

    return [
        normalize_question(
            item
            if isinstance(
                item,
                dict,
            )
            else {
                "question_text": "",
                "warnings": [
                    "Question must be an object."
                ],
            },
            index,
            source_page,
            asset_index,
        )
        for index, item in enumerate(
            items,
            start=1,
        )
    ]
