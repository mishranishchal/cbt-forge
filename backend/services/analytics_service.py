from collections import defaultdict
from typing import Any

from schemas.configuration import TestConfiguration
from schemas.question import Question
from services.scoring_service import display_number, marking_for_question, section_id_for_question


def classify_topic(attempted: int, accuracy: float) -> str:
    if attempted < 3:
        return "INSUFFICIENT DATA"
    if accuracy >= 80:
        return "STRONG"
    if accuracy >= 60:
        return "AVERAGE"
    return "WEAK"


def _group_metrics(rows: list[dict[str, Any]]) -> dict[str, Any]:
    questions = len(rows)
    attempted = sum(1 for row in rows if row["status"] != "unattempted")
    correct = sum(1 for row in rows if row["status"] == "correct")
    wrong = sum(1 for row in rows if row["status"] == "wrong")
    unattempted = sum(1 for row in rows if row["status"] == "unattempted")
    score = sum(float(row["marks"]) for row in rows)
    accuracy = (correct / attempted * 100) if attempted else 0.0
    time_spent = sum(int(row.get("time_spent_seconds") or 0) for row in rows)
    average_time = (time_spent / questions) if questions else 0.0
    return {
        "questions": questions,
        "attempted": attempted,
        "correct": correct,
        "wrong": wrong,
        "unattempted": unattempted,
        "score": score,
        "accuracy": accuracy,
        "average_time": average_time,
        "classification": classify_topic(attempted, accuracy),
    }


def analyze_attempt(
    config: TestConfiguration,
    questions: list[Question],
    scoring: dict[str, Any],
) -> dict[str, Any]:
    question_by_id = {question.id: question for question in questions}
    by_section: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_topic: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_subtopic: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for row in scoring["question_results"]:
        question = question_by_id.get(row["question_id"])
        section_id = row.get("section_id") or (section_id_for_question(config, row["question_id"]) if question else None)
        section_name = next((section.name for section in config.sections if section.id == section_id), "General")
        topic = (question.topic if question and question.topic else None) or "Uncategorized"
        subtopic = question.subtopic if question and question.subtopic else None
        by_section[section_name].append(row)
        by_topic[topic].append(row)
        if subtopic:
            by_subtopic[f"{topic} / {subtopic}"].append(row)

    section_analysis = []
    for section in config.sections:
        rows = by_section.get(section.name, [])
        metrics = _group_metrics(rows)
        section_analysis.append({"id": section.id, "name": section.name, **metrics})

    topic_analysis = [{"name": name, **_group_metrics(rows)} for name, rows in sorted(by_topic.items())]
    subtopic_analysis = [{"name": name, **_group_metrics(rows)} for name, rows in sorted(by_subtopic.items())]
    strengths = [item for item in topic_analysis if item["classification"] == "STRONG"]
    weaknesses = [item for item in topic_analysis if item["classification"] == "WEAK"]
    insufficient = [item for item in topic_analysis if item["classification"] == "INSUFFICIENT DATA"]

    return {
        "section_analysis": section_analysis,
        "topic_analysis": topic_analysis,
        "subtopic_analysis": subtopic_analysis,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "insufficient_topics": insufficient,
        "display": {
            "score": display_number(scoring["score"]),
            "maximum_score": display_number(scoring["maximum_score"]),
            "percentage": display_number(scoring["percentage"]),
            "accuracy": display_number(scoring["accuracy"]),
        },
    }


def analysis_for_ai(scoring: dict[str, Any], analytics: dict[str, Any], time_used_seconds: int) -> dict[str, Any]:
    return {
        "overall_accuracy": analytics["display"]["accuracy"],
        "score": analytics["display"]["score"],
        "maximum_score": analytics["display"]["maximum_score"],
        "percentage": analytics["display"]["percentage"],
        "attempted": scoring["attempted"],
        "correct": scoring["correct"],
        "wrong": scoring["wrong"],
        "unattempted": scoring["unattempted"],
        "total_questions": scoring["total_questions"],
        "time_used_seconds": time_used_seconds,
        "section_statistics": [
            {
                "name": item["name"],
                "accuracy": display_number(item["accuracy"]),
                "score": display_number(item["score"]),
                "attempted": item["attempted"],
                "correct": item["correct"],
                "wrong": item["wrong"],
            }
            for item in analytics["section_analysis"]
        ],
        "topic_statistics": [
            {
                "name": item["name"],
                "accuracy": display_number(item["accuracy"]),
                "attempted": item["attempted"],
                "classification": item["classification"],
            }
            for item in analytics["topic_analysis"]
        ],
        "wrong_question_topics": sorted(
            {
                row["topic"] or "Uncategorized"
                for row in scoring["question_results"]
                if row["status"] == "wrong"
            }
        ),
        "strong_areas": [{"name": item["name"], "accuracy": display_number(item["accuracy"])} for item in analytics["strengths"]],
        "weak_areas": [{"name": item["name"], "accuracy": display_number(item["accuracy"])} for item in analytics["weaknesses"]],
    }
