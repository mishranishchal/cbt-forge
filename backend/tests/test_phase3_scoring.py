from schemas.configuration import MarkingScheme, NavigationConfig, TestConfiguration, TestMetadata, TestSection, TimingConfig
from schemas.question import Option, Question
from services.analytics_service import analyze_attempt, classify_topic
from services.scoring_service import derive_runtime_status, score_attempt, score_question


def make_config(question_ids: list[str], wrong: float = -0.25) -> TestConfiguration:
    return TestConfiguration(
        test=TestMetadata(
            id="score_test",
            title="Score Test",
            timing=TimingConfig(mode="single", total_minutes=60),
            navigation=NavigationConfig(section_switching=True),
            global_marking=MarkingScheme(correct=1, wrong=wrong, unattempted=0),
            use_global_marking=True,
        ),
        sections=[TestSection(id="s1", name="Section 1", duration_minutes=60, question_ids=question_ids)],
    )


def make_question(index: int, answer: list[str] | None = None, qtype: str = "single_choice", topic: str = "Topic") -> Question:
    return Question(
        id=f"q{index:03d}",
        question_number=index,
        question_text=f"Question {index}",
        question_type=qtype,
        options=[Option(id="A", text="A"), Option(id="B", text="B"), Option(id="C", text="C")],
        correct_answer=answer or ["A"],
        topic=topic,
        section="Section 1",
    )


def test_required_scoring_example() -> None:
    questions = [make_question(index) for index in range(1, 21)]
    responses = {}
    for index in range(1, 11):
        responses[f"q{index:03d}"] = {"selected_answers": ["A"], "visited": True}
    for index in range(11, 15):
        responses[f"q{index:03d}"] = {"selected_answers": ["B"], "visited": True}
    result = score_attempt(make_config([question.id for question in questions]), questions, responses)
    assert result["score"] == 9
    assert result["maximum_score"] == 20
    assert result["percentage"] == 45
    assert round(result["accuracy"], 3) == 71.429


def test_zero_attempted_all_correct_all_wrong_all_unattempted() -> None:
    questions = [make_question(index) for index in range(1, 4)]
    config = make_config([question.id for question in questions], wrong=-1)
    assert score_attempt(config, questions, {})["accuracy"] == 0
    assert score_attempt(config, questions, {question.id: {"selected_answers": ["A"]} for question in questions})["correct"] == 3
    wrong = score_attempt(config, questions, {question.id: {"selected_answers": ["B"]} for question in questions})
    assert wrong["wrong"] == 3
    assert wrong["score"] == -3
    assert score_attempt(config, questions, {})["unattempted"] == 3


def test_decimal_marking_and_multiple_correct_exact_match() -> None:
    question = make_question(1, ["A", "C"], "multiple_choice")
    marking = MarkingScheme(correct=1.5, wrong=-0.33, unattempted=0)
    assert score_question(question, ["C", "A"], marking)["marks"] == 1.5
    assert score_question(question, ["A"], marking)["marks"] == -0.33
    assert score_question(question, ["A", "B"], marking)["marks"] == -0.33


def test_runtime_statuses() -> None:
    assert derive_runtime_status(False, [], False) == "NOT_VISITED"
    assert derive_runtime_status(True, [], False) == "NOT_ANSWERED"
    assert derive_runtime_status(True, ["A"], False) == "ANSWERED"
    assert derive_runtime_status(True, [], True) == "MARKED_FOR_REVIEW"
    assert derive_runtime_status(True, ["A"], True) == "ANSWERED_AND_MARKED"


def test_topic_classification_thresholds() -> None:
    assert classify_topic(2, 100) == "INSUFFICIENT DATA"
    assert classify_topic(3, 80) == "STRONG"
    assert classify_topic(3, 60) == "AVERAGE"
    assert classify_topic(3, 59.9) == "WEAK"


def test_analytics_groups_section_and_topic() -> None:
    questions = [make_question(1, topic="Percentages"), make_question(2, topic="Percentages"), make_question(3, topic="Algebra")]
    config = make_config([question.id for question in questions])
    scoring = score_attempt(config, questions, {"q001": {"selected_answers": ["A"]}, "q002": {"selected_answers": ["B"]}})
    analytics = analyze_attempt(config, questions, scoring)
    assert analytics["section_analysis"][0]["questions"] == 3
    assert {item["name"] for item in analytics["topic_analysis"]} == {"Percentages", "Algebra"}
