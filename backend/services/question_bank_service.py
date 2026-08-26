from pathlib import Path
import os
from uuid import uuid4

from fastapi import HTTPException

from schemas.configuration import BulkQuestionUpdate, ReorderQuestionsRequest
from schemas.question import Option, Question
from services.ai_service import AIServiceError, OpenRouterProvider
from services.validation_service import ValidationService, summarize_validation
from utils.files import TEST_DIR, read_json, test_dir, write_json


class QuestionBankService:
    def questions_path(self, test_id: str) -> Path:
        return test_dir(test_id) / "questions.json"

    def load(self, test_id: str) -> list[Question]:
        path = self.questions_path(test_id)
        if not path.exists():
            raise HTTPException(status_code=404, detail="Questions not found.")
        return [Question.model_validate(item) for item in read_json(path)]

    def save(self, test_id: str, questions: list[Question]) -> list[Question]:
        for index, question in enumerate(questions, start=1):
            question.question_number = index
        validated = ValidationService().validate_questions(questions)
        write_json(self.questions_path(test_id), [question.model_dump(mode="json") for question in validated])
        test_path = test_dir(test_id) / "test.json"
        payload = read_json(test_path) if test_path.exists() else {"test_id": test_id}
        payload["summary"] = summarize_validation(validated)
        write_json(test_path, payload)
        return validated

    def add(self, test_id: str, payload: dict) -> Question:
        questions = self.load(test_id)
        candidate = dict(payload)
        candidate["id"] = f"q_{uuid4().hex}"
        candidate.setdefault("question_number", len(questions) + 1)
        candidate.setdefault("question_text", "New question")
        candidate.setdefault("question_type", "single_choice")
        candidate.setdefault("options", [{"id": "A", "text": ""}, {"id": "B", "text": ""}])
        candidate.setdefault("answer_config", {"input_mode": "single_choice", "correct_answers": [], "accepted_answers": [], "evaluation": "automatic"})
        candidate.setdefault("marking", {"correct": "1", "incorrect": "0", "unattempted": "0", "override_default": False})
        question = Question.model_validate(candidate)
        questions.append(question)
        saved = self.save(test_id, questions)
        self._assign_new_question_to_configuration(test_id, question)
        return next(item for item in saved if item.id == question.id)

    def _assign_new_question_to_configuration(self, test_id: str, question: Question) -> None:
        from services.configuration_service import ConfigurationService

        service = ConfigurationService()
        path = service.configuration_path(test_id)
        if not path.exists():
            return
        config = service.get_or_create(test_id)
        target = next((section for section in config.sections if section.name == question.section), config.sections[0] if config.sections else None)
        if target and question.id not in target.question_ids:
            target.question_ids.append(question.id)
            target.expected_question_count = len(target.question_ids)
            service.save(test_id, config)

    def find_test_id_for_question(self, question_id: str) -> str | None:
        for path in TEST_DIR.glob("*/questions.json"):
            questions = read_json(path)
            if isinstance(questions, list) and any(isinstance(item, dict) and item.get("id") == question_id for item in questions):
                return path.parent.name
        return None

    def update_question(self, question_id: str, update: dict) -> Question:
        test_id = self.find_test_id_for_question(question_id)
        if test_id is None:
            raise HTTPException(status_code=404, detail="Question not found.")
        questions = self.load(test_id)
        for index, question in enumerate(questions):
            if question.id == question_id:
                merged = question.model_dump()
                merged.update(update)
                normalized = Question.model_validate(merged)
                if normalized.question_type == "true_false" and not normalized.options:
                    normalized.options = [Option(id="A", text="True"), Option(id="B", text="False")]
                questions[index] = normalized
                saved = self.save(test_id, questions)
                return next(item for item in saved if item.id == question_id)
        raise HTTPException(status_code=404, detail="Question not found.")

    def delete_question(self, question_id: str) -> None:
        test_id = self.find_test_id_for_question(question_id)
        if test_id is None:
            raise HTTPException(status_code=404, detail="Question not found.")
        questions = [question for question in self.load(test_id) if question.id != question_id]
        self.save(test_id, questions)
        self._remove_question_from_configuration(test_id, question_id)

    def duplicate(self, question_id: str) -> Question:
        test_id = self.find_test_id_for_question(question_id)
        if test_id is None:
            raise HTTPException(status_code=404, detail="Question not found.")
        questions = self.load(test_id)
        existing_ids = {question.id for question in questions}
        for index, question in enumerate(questions):
            if question.id == question_id:
                copy = question.model_copy(deep=True)
                suffix = 1
                new_id = f"{question.id}-copy-{suffix}"
                while new_id in existing_ids:
                    suffix += 1
                    new_id = f"{question.id}-copy-{suffix}"
                copy.id = new_id
                copy.question_number = None
                copy.warnings = sorted(set([*copy.warnings, "Duplicated question needs review."]))
                questions.insert(index + 1, copy)
                saved = self.save(test_id, questions)
                return next(item for item in saved if item.id == new_id)
        raise HTTPException(status_code=404, detail="Question not found.")

    def bulk_update(self, request: BulkQuestionUpdate) -> list[Question]:
        if not request.question_ids:
            return []
        test_id = self.find_test_id_for_question(request.question_ids[0])
        if test_id is None:
            raise HTTPException(status_code=404, detail="Questions not found.")
        updates = request.model_dump(exclude={"question_ids"}, exclude_none=True)
        questions = self.load(test_id)
        selected = set(request.question_ids)
        for question in questions:
            if question.id in selected:
                merged = question.model_dump()
                for key, value in updates.items():
                    merged[key] = value
                normalized = Question.model_validate(merged)
                question.section = normalized.section
                question.topic = normalized.topic
                question.difficulty = normalized.difficulty
        saved = self.save(test_id, questions)
        return [question for question in saved if question.id in selected]

    def reorder(self, request: ReorderQuestionsRequest) -> list[Question]:
        questions = self.load(request.test_id)
        by_id = {question.id: question for question in questions}
        ordered: list[Question] = []
        seen: set[str] = set()
        for question_id in request.question_ids:
            if question_id in by_id and question_id not in seen:
                ordered.append(by_id[question_id])
                seen.add(question_id)
        ordered.extend(question for question in questions if question.id not in seen)
        for index, question in enumerate(ordered, start=1):
            if question.question_number is None:
                question.question_number = index
        saved = self.save(request.test_id, ordered)
        self._reorder_configuration_questions(request.test_id, saved)
        return saved

    def _remove_question_from_configuration(self, test_id: str, question_id: str) -> None:
        from services.configuration_service import ConfigurationService

        service = ConfigurationService()
        path = service.configuration_path(test_id)
        if not path.exists():
            return
        config = service.get_or_create(test_id)
        for section in config.sections:
            if question_id in section.question_ids:
                section.question_ids = [item for item in section.question_ids if item != question_id]
                section.expected_question_count = len(section.question_ids)
        service.save(test_id, config)

    def _reorder_configuration_questions(self, test_id: str, questions: list[Question]) -> None:
        from services.configuration_service import ConfigurationService

        service = ConfigurationService()
        path = service.configuration_path(test_id)
        if not path.exists():
            return
        config = service.get_or_create(test_id)
        position = {question.id: index for index, question in enumerate(questions)}
        for section in config.sections:
            section.question_ids.sort(key=lambda question_id: position.get(question_id, len(position)))
            section.expected_question_count = len(section.question_ids)
        service.save(test_id, config)

    async def organize_missing_metadata(self, test_id: str) -> list[Question]:
        questions = self.load(test_id)
        missing = [
            question
            for question in questions
            if not question.section or not question.topic or not question.subtopic or question.difficulty == "unknown"
        ]
        ai_enabled = os.getenv("AI_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
        if missing and ai_enabled:
            try:
                payload = [
                    {
                        "id": question.id,
                        "question_text": question.question_text,
                        "options": [option.model_dump() for option in question.options],
                        "section": question.section,
                        "topic": question.topic,
                        "subtopic": question.subtopic,
                        "difficulty": question.difficulty,
                    }
                    for question in missing[:50]
                ]
                classified = await OpenRouterProvider().classify_metadata(payload)
                by_id = {item.get("id"): item for item in classified if isinstance(item, dict)}
                for question in questions:
                    item = by_id.get(question.id)
                    if not item:
                        continue
                    if not question.section and item.get("section"):
                        question.section = item["section"]
                    if not question.topic and item.get("topic"):
                        question.topic = item["topic"]
                    if not question.subtopic and item.get("subtopic"):
                        question.subtopic = item["subtopic"]
                    if question.difficulty == "unknown" and item.get("difficulty") in {"easy", "medium", "hard", "unknown"}:
                        question.difficulty = item["difficulty"]
            except AIServiceError:
                pass
        for question in questions:
            if question.section and question.topic and question.difficulty != "unknown":
                continue
            text = f"{question.question_text} {question.topic or ''}".lower()
            if not question.topic:
                if any(word in text for word in ("percent", "algebra", "solve", "marks", "table")):
                    question.topic = "Quantitative Aptitude"
                elif any(word in text for word in ("python", "code", "function", "range")):
                    question.topic = "Programming"
                elif any(word in text for word in ("gas", "earth", "capital")):
                    question.topic = "General Knowledge"
                else:
                    question.topic = "General"
            if not question.section:
                question.section = "Technical" if question.topic == "Programming" else "Quantitative Aptitude" if question.topic == "Quantitative Aptitude" else "General"
            if not question.subtopic:
                question.subtopic = question.topic
            if question.difficulty == "unknown":
                question.difficulty = "medium"
        return self.save(test_id, questions)


def stable_question_id() -> str:
    return f"q_{uuid4().hex}"
