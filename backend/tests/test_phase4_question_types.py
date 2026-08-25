from schemas.configuration import (
    MarkingScheme,
    TestConfiguration,
    TestMetadata,
    TestSection,
)
from schemas.question import (
    AnswerConfig,
    AnswerInputMode,
    EvaluationMode,
    MarkingRule,
    NumericalAnswer,
    Option,
    Question,
    QuestionType,
)
from services.scoring_service import (
    evaluate_question_answer,
    score_attempt,
    score_question,
)


def make_question(
    question_type: QuestionType,
    correct_answers: list[str],
    *,
    answer_config: AnswerConfig | None = None,
    marking: MarkingRule | None = None,
    numerical_answer: NumericalAnswer | None = None,
) -> Question:
    options = [
        Option(id="A", text="Option A"),
        Option(id="B", text="Option B"),
        Option(id="C", text="Option C"),
        Option(id="D", text="Option D"),
    ]

    return Question(
        id="q001",
        question_number=1,
        question_type=question_type,
        question_text="Test question",
        options=options,
        correct_answer=correct_answers,
        answer_config=answer_config
        or AnswerConfig(
            correct_answers=correct_answers,
        ),
        marking=marking or MarkingRule(),
        numerical_answer=numerical_answer,
    )


def make_config(question: Question) -> TestConfiguration:
    return TestConfiguration(
        test=TestMetadata(
            id="phase4_test",
            title="Phase 4 Test",
            global_marking=MarkingScheme(
                correct=1,
                wrong=-0.25,
                unattempted=0,
            ),
            use_global_marking=True,
        ),
        sections=[
            TestSection(
                id="section_1",
                name="Section 1",
                question_ids=[question.id],
            )
        ],
    )


# ---------------------------------------------------------------------------
# INTEGER
# ---------------------------------------------------------------------------


def test_integer_answer_exact_match() -> None:
    question = make_question(
        QuestionType.integer,
        ["42"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.integer,
            correct_answers=["42"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["42"],
    )

    assert status == "correct"
    assert result is True


def test_integer_answer_wrong_value() -> None:
    question = make_question(
        QuestionType.integer,
        ["42"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.integer,
            correct_answers=["42"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["41"],
    )

    assert status == "wrong"
    assert result is False


def test_integer_rejects_non_numeric_answer() -> None:
    question = make_question(
        QuestionType.integer,
        ["42"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.integer,
            correct_answers=["42"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["abc"],
    )

    assert status == "wrong"
    assert result is False


# ---------------------------------------------------------------------------
# REAL NUMBER
# ---------------------------------------------------------------------------


def test_real_number_exact_match() -> None:
    question = make_question(
        QuestionType.real_number,
        ["10.5"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.real_number,
            correct_answers=["10.5"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["10.5"],
    )

    assert status == "correct"
    assert result is True


def test_real_number_decimal_equivalence() -> None:
    question = make_question(
        QuestionType.real_number,
        ["10.50"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.real_number,
            correct_answers=["10.50"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["10.5"],
    )

    assert status == "correct"
    assert result is True


# ---------------------------------------------------------------------------
# NUMERICAL TOLERANCE
# ---------------------------------------------------------------------------


def test_numerical_tolerance_accepts_value_inside_tolerance() -> None:
    question = make_question(
        QuestionType.numerical_tolerance,
        ["10"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.real_number,
            correct_answers=["10"],
            tolerance="0.01",
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["10.01"],
    )

    assert status == "correct"
    assert result is True


def test_numerical_tolerance_rejects_value_outside_tolerance() -> None:
    question = make_question(
        QuestionType.numerical_tolerance,
        ["10"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.real_number,
            correct_answers=["10"],
            tolerance="0.01",
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["10.02"],
    )

    assert status == "wrong"
    assert result is False


# ---------------------------------------------------------------------------
# MULTIPLE SELECT
# ---------------------------------------------------------------------------


def test_multiple_select_requires_exact_set() -> None:
    question = make_question(
        QuestionType.multiple_select,
        ["A", "C"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.multiple_select,
            correct_answers=["A", "C"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["C", "A"],
    )

    assert status == "correct"
    assert result is True


def test_multiple_select_rejects_extra_option() -> None:
    question = make_question(
        QuestionType.multiple_select,
        ["A", "C"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.multiple_select,
            correct_answers=["A", "C"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["A", "B", "C"],
    )

    assert status == "wrong"
    assert result is False


def test_multiple_select_rejects_missing_option() -> None:
    question = make_question(
        QuestionType.multiple_select,
        ["A", "C"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.multiple_select,
            correct_answers=["A", "C"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["A"],
    )

    assert status == "wrong"
    assert result is False


# ---------------------------------------------------------------------------
# TRUE / FALSE
# ---------------------------------------------------------------------------


def test_true_false_accepts_true_alias() -> None:
    question = make_question(
        QuestionType.true_false,
        ["true"],
        answer_config=AnswerConfig(
            correct_answers=["true"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["T"],
    )

    assert status == "correct"
    assert result is True


def test_true_false_accepts_false_alias() -> None:
    question = make_question(
        QuestionType.true_false,
        ["false"],
        answer_config=AnswerConfig(
            correct_answers=["false"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["0"],
    )

    assert status == "correct"
    assert result is True


# ---------------------------------------------------------------------------
# SHORT ANSWER
# ---------------------------------------------------------------------------


def test_short_answer_is_case_insensitive_by_default() -> None:
    question = make_question(
        QuestionType.short_answer,
        ["Delhi"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.text,
            correct_answers=["Delhi"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["delhi"],
    )

    assert status == "correct"
    assert result is True


def test_short_answer_can_be_case_sensitive() -> None:
    question = make_question(
        QuestionType.short_answer,
        ["Delhi"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.text,
            correct_answers=["Delhi"],
            case_sensitive=True,
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["delhi"],
    )

    assert status == "wrong"
    assert result is False


def test_short_answer_accepts_alias() -> None:
    question = make_question(
        QuestionType.short_answer,
        ["Delhi"],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.text,
            correct_answers=["Delhi"],
            accepted_answers=["New Delhi"],
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["New Delhi"],
    )

    assert status == "correct"
    assert result is True


# ---------------------------------------------------------------------------
# LONG ANSWER / MANUAL EVALUATION
# ---------------------------------------------------------------------------


def test_long_answer_requires_manual_evaluation() -> None:
    question = make_question(
        QuestionType.long_answer,
        [],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.long_text,
            evaluation=EvaluationMode.manual,
        ),
    )

    status, result = evaluate_question_answer(
        question,
        ["This is a descriptive answer."],
    )

    assert status == "manual"
    assert result is None


def test_long_answer_receives_zero_automatic_marks() -> None:
    question = make_question(
        QuestionType.long_answer,
        [],
        answer_config=AnswerConfig(
            input_mode=AnswerInputMode.long_text,
            evaluation=EvaluationMode.manual,
        ),
    )

    result = score_question(
        question,
        ["This is a descriptive answer."],
        MarkingRule(
            correct="5",
            incorrect="-2",
            unattempted="0",
        ),
    )

    assert result["status"] == "manual"
    assert result["marks"] == 0
    assert result["evaluation"] == "manual"


# ---------------------------------------------------------------------------
# QUESTION-LEVEL MARKING
# ---------------------------------------------------------------------------


def test_question_level_marking_override() -> None:
    question = make_question(
        QuestionType.single_choice,
        ["A"],
        marking=MarkingRule(
            correct="5",
            incorrect="-2",
            unattempted="0",
            override_default=True,
        ),
    )

    config = make_config(question)

    result = score_attempt(
        config,
        [question],
        {
            question.id: {
                "selected_answers": ["A"],
                "visited": True,
            }
        },
    )

    assert result["score"] == 5
    assert result["maximum_score"] == 5


def test_question_without_override_uses_global_marking() -> None:
    question = make_question(
        QuestionType.single_choice,
        ["A"],
        marking=MarkingRule(
            correct="5",
            incorrect="-2",
            unattempted="0",
            override_default=False,
        ),
    )

    config = make_config(question)

    result = score_attempt(
        config,
        [question],
        {
            question.id: {
                "selected_answers": ["A"],
                "visited": True,
            }
        },
    )

    assert result["score"] == 1
    assert result["maximum_score"] == 1


# ---------------------------------------------------------------------------
# DIFFERENT QUESTION WEIGHTS
# ---------------------------------------------------------------------------


def test_maximum_score_is_sum_of_individual_question_weights() -> None:
    question_1 = Question(
        id="q001",
        question_number=1,
        question_type=QuestionType.single_choice,
        question_text="Question 1",
        options=[
            Option(id="A", text="A"),
            Option(id="B", text="B"),
        ],
        correct_answer=["A"],
        answer_config=AnswerConfig(
            correct_answers=["A"],
        ),
        marking=MarkingRule(
            correct="1",
            incorrect="-0.25",
            unattempted="0",
            maximum_marks="1",
            override_default=True,
        ),
    )

    question_2 = Question(
        id="q002",
        question_number=2,
        question_type=QuestionType.single_choice,
        question_text="Question 2",
        options=[
            Option(id="A", text="A"),
            Option(id="B", text="B"),
        ],
        correct_answer=["A"],
        answer_config=AnswerConfig(
            correct_answers=["A"],
        ),
        marking=MarkingRule(
            correct="2.5",
            incorrect="-0.5",
            unattempted="0",
            maximum_marks="2.5",
            override_default=True,
        ),
    )

    config = TestConfiguration(
        test=TestMetadata(
            id="weighted_test",
            title="Weighted Test",
            global_marking=MarkingScheme(
                correct=1,
                wrong=-0.25,
                unattempted=0,
            ),
            use_global_marking=True,
        ),
        sections=[
            TestSection(
                id="section_1",
                name="Section 1",
                question_ids=["q001", "q002"],
            )
        ],
    )

    result = score_attempt(
        config,
        [question_1, question_2],
        {
            "q001": {
                "selected_answers": ["A"],
                "visited": True,
            },
            "q002": {
                "selected_answers": ["A"],
                "visited": True,
            },
        },
    )

    assert result["score"] == 3.5
    assert result["maximum_score"] == 3.5
    assert result["percentage"] == 100.0


# ---------------------------------------------------------------------------
# FRACTIONAL NEGATIVE MARKING
# ---------------------------------------------------------------------------


def test_decimal_and_fraction_negative_marks_are_distinct() -> None:
    decimal_marking = MarkingRule(
        correct="1",
        incorrect="-0.33",
        unattempted="0",
        override_default=True,
    )

    fraction_marking = MarkingRule(
        correct="1",
        incorrect="-1/3",
        unattempted="0",
        override_default=True,
    )

    question = make_question(
        QuestionType.single_choice,
        ["A"],
    )

    decimal_result = score_question(
        question,
        ["B"],
        decimal_marking,
    )

    fraction_result = score_question(
        question,
        ["B"],
        fraction_marking,
    )

    assert decimal_result["marks"] == -0.33
    assert fraction_result["marks"] == -(1 / 3)


# ---------------------------------------------------------------------------
# UNATTEMPTED
# ---------------------------------------------------------------------------


def test_unattempted_question_uses_unattempted_marks() -> None:
    question = make_question(
        QuestionType.single_choice,
        ["A"],
    )

    result = score_question(
        question,
        [],
        MarkingRule(
            correct="2",
            incorrect="-1",
            unattempted="0.5",
        ),
    )

    assert result["status"] == "unattempted"
    assert result["marks"] == 0.5