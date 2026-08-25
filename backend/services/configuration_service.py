from collections import Counter
from pathlib import Path
from uuid import uuid4

from schemas.configuration import (
    BehaviorConfig,
    ConfigurationValidationResult,
    MarkingScheme,
    NavigationConfig,
    TestConfiguration,
    TestMetadata,
    TestSection,
    TimingConfig,
    TimingMode,
)
from schemas.question import Question
from utils.files import read_json, test_dir, write_json


DEFAULT_INSTRUCTIONS = """1. Read each question carefully.
2. Each correct answer carries the configured positive marks.
3. Incorrect answers may carry negative marks as configured.
4. Unattempted questions carry the configured unattempted marks.
5. You may mark questions for review if enabled."""


class ConfigurationService:
    def configuration_path(self, test_id: str) -> Path:
        return test_dir(test_id) / "configuration.json"

    def load_questions(self, test_id: str) -> list[Question]:
        path = test_dir(test_id) / "questions.json"
        if not path.exists():
            return []
        return [Question.model_validate(item) for item in read_json(path)]

    def get_or_create(self, test_id: str) -> TestConfiguration:
        path = self.configuration_path(test_id)
        if path.exists():
            return TestConfiguration.model_validate(read_json(path))
        config = self.default_configuration(test_id, self.load_questions(test_id))
        self.save(test_id, config)
        return config

    def save(self, test_id: str, config: TestConfiguration) -> TestConfiguration:
        write_json(self.configuration_path(test_id), config.model_dump(mode="json"))
        test_path = test_dir(test_id) / "test.json"
        payload = read_json(test_path) if test_path.exists() else {"test_id": test_id, "status": "configured"}
        payload["configuration_status"] = "saved"
        payload["title"] = config.test.title
        write_json(test_path, payload)
        return config

    def default_configuration(self, test_id: str, questions: list[Question]) -> TestConfiguration:
        sections_by_name: dict[str, list[str]] = {}
        for question in questions:
            section_name = question.section or self._infer_section(question)
            sections_by_name.setdefault(section_name, []).append(question.id)

        sections: list[TestSection] = []
        for index, (name, question_ids) in enumerate(sections_by_name.items(), start=1):
            sections.append(
                TestSection(
                    id=f"section_{index:03d}",
                    name=name,
                    duration_minutes=max(10, len(question_ids) * 2),
                    expected_question_count=len(question_ids),
                    marking=MarkingScheme(),
                    question_ids=question_ids,
                )
            )

        if not sections:
            sections = [TestSection(id="section_001", name="General", duration_minutes=60, expected_question_count=0)]

        total_minutes = sum(section.duration_minutes for section in sections)
        return TestConfiguration(
            test=TestMetadata(
                id=test_id,
                title="CBT Forge Mock Test",
                description="Configured from extracted CBT Forge questions.",
                instructions=DEFAULT_INSTRUCTIONS,
                timing=TimingConfig(mode=TimingMode.section if len(sections) > 1 else TimingMode.single, total_minutes=max(1, total_minutes)),
                navigation=NavigationConfig(),
                behavior=BehaviorConfig(),
                global_marking=MarkingScheme(),
                use_global_marking=True,
            ),
            sections=sections,
        )

    def validate(self, test_id: str, config: TestConfiguration | None = None) -> ConfigurationValidationResult:
        config = config or self.get_or_create(test_id)
        questions = self.load_questions(test_id)
        question_by_id = {question.id: question for question in questions}
        errors: list[str] = []
        warnings: list[str] = []

        if not config.test.title.strip():
            errors.append("Test name is required.")
        if not config.sections:
            errors.append("At least one section is required.")
        if config.test.timing.total_minutes <= 0:
            errors.append("Duration must be greater than zero.")

        all_assigned: list[str] = []
        for section in config.sections:
            if not section.name.strip():
                errors.append(f"Section {section.id} must have a name.")
            if not section.question_ids:
                errors.append(f"Section {section.name} must contain at least one question.")
            if section.duration_minutes <= 0:
                errors.append(f"Section {section.name} duration must be greater than zero.")
            if section.expected_question_count is not None and len(section.question_ids) != section.expected_question_count:
                warnings.append(
                    f"Section {section.name} contains {len(section.question_ids)} questions but expects {section.expected_question_count}."
                )
            for question_id in section.question_ids:
                if question_id not in question_by_id:
                    errors.append(f"Section {section.name} references unknown question {question_id}.")
            all_assigned.extend(section.question_ids)

        duplicates = [question_id for question_id, count in Counter(all_assigned).items() if count > 1]
        if duplicates:
            errors.append(f"Duplicate question assignments: {', '.join(duplicates)}.")

        for question in questions:
            if question.question_type in {"single_choice", "multiple_choice", "true_false"} and not question.correct_answer:
                warnings.append(f"Question {question.question_number or question.id} has no required answer.")

        return ConfigurationValidationResult(valid=not errors, errors=errors, warnings=warnings)

    def new_section(self, name: str = "New Section") -> TestSection:
        return TestSection(id=f"section_{uuid4().hex[:10]}", name=name, duration_minutes=30, expected_question_count=0)

    def _infer_section(self, question: Question) -> str:
        topic = (question.topic or "").lower()
        if any(word in topic for word in ("math", "percentage", "algebra", "quant", "data")):
            return "Quantitative Aptitude"
        if any(word in topic for word in ("programming", "code", "python")):
            return "Technical"
        if any(word in topic for word in ("science", "general")):
            return "General Awareness"
        return "General"
