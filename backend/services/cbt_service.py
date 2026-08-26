import random
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from schemas.attempt import AttemptEventCreate, QuestionRuntimeStatus, ResponseUpdate, SubmissionReason
from schemas.configuration import TestConfiguration
from schemas.question import Question
from services.analytics_service import analyze_attempt
from services.attempt_store import AttemptStore, utc_now
from services.configuration_service import ConfigurationService
from services.scoring_service import derive_runtime_status, score_attempt


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class CbtService:
    def __init__(self) -> None:
        self.store = AttemptStore()
        self.configurations = ConfigurationService()

    def create_attempt(self, test_id: str, resume_if_active: bool = True) -> dict[str, Any]:
        if resume_if_active:
            active = self.store.active_attempt(test_id)
            if active:
                return self.public_attempt(active["id"])
        questions = self.configurations.load_questions(test_id)
        if not questions:
            raise HTTPException(status_code=404, detail="Questions not found.")
        config = self.configurations.get_or_create(test_id)
        validation = self.configurations.validate(test_id, config)
        if not validation.valid:
            raise HTTPException(status_code=400, detail={"message": "Test configuration is invalid.", "errors": validation.errors})

        snapshot_questions = [deepcopy(question.model_dump(mode="json")) for question in questions]
        snapshot_config = deepcopy(config.model_dump(mode="json"))
        rng = random.Random(uuid4().hex)
        if config.test.behavior.shuffle_questions:
            for section in snapshot_config["sections"]:
                rng.shuffle(section["question_ids"])
        if config.test.behavior.shuffle_options:
            for question in snapshot_questions:
                rng.shuffle(question["options"])

        first_section = snapshot_config["sections"][0]
        first_question = first_section["question_ids"][0] if first_section["question_ids"] else snapshot_questions[0]["id"]
        now = datetime.now(timezone.utc)
        section_timers = {}
        for section in snapshot_config["sections"]:
            section_timers[section["id"]] = {
                "remaining_seconds": int(section["duration_minutes"]) * 60,
                "entered_at": now.isoformat() if section["id"] == first_section["id"] else None,
                "finished": False,
            }
        remaining = self._initial_remaining(snapshot_config, now)
        attempt_id = f"attempt_{uuid4().hex[:12]}"
        self.store.insert_attempt(
            {
                "id": attempt_id,
                "test_id": test_id,
                "start_time": now.isoformat(),
                "status": "IN_PROGRESS",
                "current_section": first_section["id"],
                "current_question": first_question,
                "remaining_time_seconds": remaining,
                "configuration_snapshot": snapshot_config,
                "question_snapshot": snapshot_questions,
                "section_timers": section_timers,
                "last_synced": now.isoformat(),
            }
        )
        self.store.add_event(attempt_id, "ATTEMPT_STARTED", {"test_id": test_id})
        self.store.upsert_response(
            attempt_id,
            first_question,
            {
                "visited": True,
                "selected_answers": [],
                "marked_for_review": False,
                "status": QuestionRuntimeStatus.not_answered.value,
                "time_spent_seconds": 0,
                "last_updated": now.isoformat(),
            },
        )
        return self.public_attempt(attempt_id)

    def get_attempt(self, attempt_id: str) -> dict[str, Any]:
        return self.public_attempt(attempt_id)

    def public_attempt(self, attempt_id: str, include_answers: bool = False) -> dict[str, Any]:
        attempt = self._require_attempt(attempt_id)
        config = TestConfiguration.model_validate(attempt["configuration_snapshot"])
        remaining, section_timers, status, timed_out_section = self._refresh_timers(attempt)
        if status != attempt["status"] or section_timers != attempt["section_timers"]:
            fields: dict[str, Any] = {
                "remaining_time_seconds": remaining,
                "section_timers": section_timers,
                "last_synced": utc_now(),
            }
            if timed_out_section and status == "IN_PROGRESS":
                next_state = self._advance_section(attempt, timed_out_section, section_timers)
                fields.update(next_state)
                if next_state.get("status") == "TIMED_OUT":
                    self.store.update_attempt(attempt_id, fields)
                    self.submit(attempt_id, SubmissionReason.section_timeout)
                    attempt = self._require_attempt(attempt_id)
                    remaining = 0
                else:
                    self.store.update_attempt(attempt_id, fields)
                    attempt = self._require_attempt(attempt_id)
                    remaining = attempt["remaining_time_seconds"]
            elif status == "TIMED_OUT":
                self.store.update_attempt(attempt_id, fields)
                self.submit(attempt_id, SubmissionReason.timeout)
                attempt = self._require_attempt(attempt_id)
                remaining = 0
            else:
                self.store.update_attempt(attempt_id, fields)
                attempt = self._require_attempt(attempt_id)
                remaining = attempt["remaining_time_seconds"]

        questions = attempt["question_snapshot"]
        if attempt["status"] == "IN_PROGRESS" and not include_answers:
            questions = [self._strip_secrets(question) for question in questions]
        responses = {item["question_id"]: item for item in self.store.list_responses(attempt_id)}
        return {
            "attempt_id": attempt["id"],
            "test_id": attempt["test_id"],
            "start_time": attempt["start_time"],
            "end_time": attempt["end_time"],
            "status": attempt["status"],
            "current_section": attempt["current_section"],
            "current_question": attempt["current_question"],
            "remaining_time_seconds": remaining,
            "section_timers": attempt["section_timers"],
            "submission_reason": attempt["submission_reason"],
            "configuration": config.model_dump(mode="json"),
            "questions": questions,
            "responses": responses,
            "events": self._event_summary(attempt_id),
        }

    def save_response(self, attempt_id: str, question_id: str, update: ResponseUpdate) -> dict[str, Any]:
        attempt = self._require_in_progress(attempt_id)
        allowed_ids = {question["id"] for question in attempt["question_snapshot"]}
        if question_id not in allowed_ids:
            raise HTTPException(status_code=400, detail="Invalid question ID for this attempt.")
        existing = self.store.get_response(attempt_id, question_id) or {
            "selected_answers": [],
            "numeric_value": None,
            "text_answer": None,
            "visited": False,
            "marked_for_review": False,
            "time_spent_seconds": 0,
        }
        selected = update.selected_answers if update.selected_answers is not None else existing["selected_answers"]
        # model_fields_set distinguishes an omitted field from an explicit
        # null sent by Clear response.
        numeric_value = (
            update.numeric_value
            if "numeric_value" in update.model_fields_set
            else existing.get("numeric_value")
        )
        text_answer = (
            update.text_answer
            if "text_answer" in update.model_fields_set
            else existing.get("text_answer")
        )
        visited = True if update.visited is None else update.visited
        marked = existing["marked_for_review"] if update.marked_for_review is None else update.marked_for_review
        time_spent = existing["time_spent_seconds"]
        if update.time_spent_seconds is not None:
            time_spent = max(time_spent, update.time_spent_seconds)
        status = derive_runtime_status(visited, selected, marked, numeric_value, text_answer)
        saved = self.store.upsert_response(
            attempt_id,
            question_id,
            {
                "selected_answers": selected,
                "numeric_value": numeric_value,
                "text_answer": text_answer,
                "visited": visited,
                "marked_for_review": marked,
                "status": status,
                "time_spent_seconds": time_spent,
                "last_updated": update.last_updated or utc_now(),
            },
        )
        fields: dict[str, Any] = {"last_synced": utc_now()}
        if update.current_section and update.current_section != attempt["current_section"]:
            fields.update(self._switch_section(attempt, update.current_section))
        if update.current_question:
            fields["current_question"] = update.current_question
        remaining, section_timers, _, _ = self._refresh_timers({**attempt, **fields} if "section_timers" in fields else attempt)
        fields["remaining_time_seconds"] = remaining
        if "section_timers" not in fields:
            fields["section_timers"] = section_timers
        self.store.update_attempt(attempt_id, fields)
        return saved

    def save_responses_batch(self, attempt_id: str, updates: list[dict[str, Any]], current_section: str | None = None, current_question: str | None = None) -> list[dict[str, Any]]:
        saved = []
        for item in updates:
            question_id = item.get("question_id")
            if not question_id:
                continue
            payload = ResponseUpdate.model_validate({k: v for k, v in item.items() if k != "question_id"})
            saved.append(self.save_response(attempt_id, question_id, payload))
        if current_section or current_question:
            self.save_response(
                attempt_id,
                current_question or self._require_attempt(attempt_id)["current_question"],
                ResponseUpdate(current_section=current_section, current_question=current_question, visited=True),
            )
        return saved

    def add_event(self, attempt_id: str, event: AttemptEventCreate) -> dict[str, Any]:
        self._require_attempt(attempt_id)
        allowed = {"TAB_HIDDEN", "TAB_VISIBLE", "FULLSCREEN_ENTER", "FULLSCREEN_EXIT", "CONNECTION_LOST", "CONNECTION_RESTORED", "RESUME"}
        if event.event_type not in allowed:
            raise HTTPException(status_code=400, detail="Unsupported event type.")
        self.store.add_event(attempt_id, event.event_type, event.payload)
        return {"status": "recorded"}

    def submit(self, attempt_id: str, reason: SubmissionReason = SubmissionReason.manual, current_section: str | None = None, current_question: str | None = None) -> dict[str, Any]:
        attempt = self._require_attempt(attempt_id)
        existing = self.store.get_result(attempt_id)
        if attempt["status"] in {"COMPLETED", "TIMED_OUT"} and existing:
            return existing
        if current_section or current_question:
            fields = {}
            if current_section:
                fields["current_section"] = current_section
            if current_question:
                fields["current_question"] = current_question
            self.store.update_attempt(attempt_id, fields)
            attempt = self._require_attempt(attempt_id)

        config = TestConfiguration.model_validate(attempt["configuration_snapshot"])
        questions = [Question.model_validate(item) for item in attempt["question_snapshot"]]
        responses = {item["question_id"]: item for item in self.store.list_responses(attempt_id)}
        scoring = score_attempt(config, questions, responses)
        analytics = analyze_attempt(config, questions, scoring)
        end_time = utc_now()
        start = parse_time(attempt["start_time"])
        time_used = max(0, int((parse_time(end_time) - start).total_seconds()))
        status = "TIMED_OUT" if reason in {SubmissionReason.timeout, SubmissionReason.section_timeout} else "COMPLETED"
        result = {
            "attempt_id": attempt_id,
            "test_id": attempt["test_id"],
            "status": status,
            "submission_reason": reason.value,
            "start_time": attempt["start_time"],
            "end_time": end_time,
            "time_used_seconds": time_used,
            "configuration": config.model_dump(mode="json"),
            "questions": [question.model_dump(mode="json") for question in questions],
            "responses": responses,
            "scoring": scoring,
            "analytics": analytics,
            "ai_analysis": self.store.get_ai_analysis(attempt_id),
        }
        self.store.save_result(attempt_id, result)
        self.store.update_attempt(
            attempt_id,
            {
                "status": status,
                "end_time": end_time,
                "submission_reason": reason.value,
                "remaining_time_seconds": 0,
                "last_synced": end_time,
            },
        )
        self.store.add_event(attempt_id, "SUBMITTED", {"reason": reason.value})
        return result

    def get_result(self, attempt_id: str) -> dict[str, Any]:
        result = self.store.get_result(attempt_id)
        if not result:
            attempt = self._require_attempt(attempt_id)
            if attempt["status"] == "IN_PROGRESS":
                raise HTTPException(status_code=409, detail="This attempt has not been submitted yet.")
            result = self.submit(attempt_id, SubmissionReason.system)
        result["ai_analysis"] = self.store.get_ai_analysis(attempt_id)
        return result

    def history(self) -> list[dict[str, Any]]:
        items = []
        for attempt in self.store.list_history():
            result = self.store.get_result(attempt["id"])
            config = attempt["configuration_snapshot"]
            scoring = (result or {}).get("scoring") or {}
            items.append(
                {
                    "attempt_id": attempt["id"],
                    "test_id": attempt["test_id"],
                    "title": config.get("test", {}).get("title") or attempt["test_id"],
                    "date": attempt["end_time"] or attempt["start_time"],
                    "status": attempt["status"],
                    "score": scoring.get("score"),
                    "maximum_score": scoring.get("maximum_score"),
                    "accuracy": scoring.get("accuracy"),
                    "attempted": scoring.get("attempted"),
                    "total_questions": scoring.get("total_questions"),
                }
            )
        return items

    def delete_attempt(self, attempt_id: str) -> None:
        self._require_attempt(attempt_id)
        self.store.delete_attempt(attempt_id)

    def retake(self, attempt_id: str) -> dict[str, Any]:
        attempt = self._require_attempt(attempt_id)
        return self.create_attempt(attempt["test_id"], resume_if_active=False)

    def _require_attempt(self, attempt_id: str) -> dict[str, Any]:
        attempt = self.store.get_attempt(attempt_id)
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found.")
        return attempt

    def _require_in_progress(self, attempt_id: str) -> dict[str, Any]:
        attempt = self._require_attempt(attempt_id)
        if attempt["status"] != "IN_PROGRESS":
            raise HTTPException(status_code=409, detail="This attempt is no longer in progress.")
        return attempt

    def _strip_secrets(self, question: dict[str, Any]) -> dict[str, Any]:
        public = deepcopy(question)
        public["correct_answer"] = None
        public["explanation"] = None
        return public

    def _initial_remaining(self, config: dict[str, Any], now: datetime) -> int:
        timing = config["test"]["timing"]
        if timing["mode"] == "single":
            return int(timing["total_minutes"]) * 60
        first = config["sections"][0]
        return int(first["duration_minutes"]) * 60

    def _refresh_timers(self, attempt: dict[str, Any]) -> tuple[int, dict[str, Any], str, str | None]:
        if attempt["status"] != "IN_PROGRESS":
            return max(0, int(attempt["remaining_time_seconds"] or 0)), attempt["section_timers"], attempt["status"], None
        now = datetime.now(timezone.utc)
        config = attempt["configuration_snapshot"]
        start = parse_time(attempt["start_time"])
        if config["test"]["timing"]["mode"] == "single":
            total = int(config["test"]["timing"]["total_minutes"]) * 60
            remaining = max(0, total - int((now - start).total_seconds()))
            status = "TIMED_OUT" if remaining <= 0 else "IN_PROGRESS"
            return remaining, attempt["section_timers"], status, None

        timers = deepcopy(attempt["section_timers"])
        current = attempt["current_section"]
        timed_out_section = None
        for section_id, timer in timers.items():
            remaining = int(timer.get("remaining_seconds") or 0)
            if timer.get("finished"):
                timer["remaining_seconds"] = 0
                continue
            if section_id == current and timer.get("entered_at"):
                elapsed = int((now - parse_time(timer["entered_at"])).total_seconds())
                remaining = max(0, remaining - elapsed)
                if remaining <= 0:
                    timer["finished"] = True
                    timer["remaining_seconds"] = 0
                    timer["entered_at"] = None
                    timed_out_section = section_id
                else:
                    timer["remaining_seconds"] = remaining
                    timer["entered_at"] = now.isoformat()
            timer["remaining_seconds"] = max(0, int(timer.get("remaining_seconds") or 0))
        remaining = int(timers.get(current, {}).get("remaining_seconds") or 0)
        unfinished = [section["id"] for section in config["sections"] if not timers.get(section["id"], {}).get("finished")]
        status = "IN_PROGRESS"
        if timed_out_section and not unfinished:
            status = "TIMED_OUT"
            remaining = 0
        return remaining, timers, status, timed_out_section

    def _switch_section(self, attempt: dict[str, Any], section_id: str) -> dict[str, Any]:
        config = TestConfiguration.model_validate(attempt["configuration_snapshot"])
        valid_ids = {section.id for section in config.sections}
        if section_id not in valid_ids:
            raise HTTPException(status_code=400, detail="Invalid section ID.")
        if not config.test.navigation.section_switching and section_id != attempt["current_section"]:
            raise HTTPException(status_code=400, detail="Section switching is disabled.")
        now = datetime.now(timezone.utc)
        remaining, timers, _, _ = self._refresh_timers(attempt)
        current = attempt["current_section"]
        if current in timers and timers[current].get("entered_at"):
            elapsed = int((now - parse_time(timers[current]["entered_at"])).total_seconds())
            timers[current]["remaining_seconds"] = max(0, int(timers[current]["remaining_seconds"]) - elapsed)
            timers[current]["entered_at"] = None
        if timers.get(section_id, {}).get("finished"):
            raise HTTPException(status_code=400, detail="This section is already finished.")
        timers[section_id]["entered_at"] = now.isoformat()
        section = next(item for item in config.sections if item.id == section_id)
        question_id = section.question_ids[0] if section.question_ids else attempt["current_question"]
        display_remaining = timers[section_id]["remaining_seconds"] if config.test.timing.mode == "section" else remaining
        return {
            "current_section": section_id,
            "current_question": question_id,
            "section_timers": timers,
            "remaining_time_seconds": display_remaining,
        }

    def _advance_section(self, attempt: dict[str, Any], finished_section_id: str, timers: dict[str, Any]) -> dict[str, Any]:
        config = TestConfiguration.model_validate(attempt["configuration_snapshot"])
        ids = [section.id for section in config.sections]
        remaining_ids = [section_id for section_id in ids if not timers.get(section_id, {}).get("finished")]
        if not remaining_ids:
            return {"status": "TIMED_OUT", "remaining_time_seconds": 0, "section_timers": timers}
        next_id = remaining_ids[0]
        now = datetime.now(timezone.utc)
        timers[next_id]["entered_at"] = now.isoformat()
        section = next(item for item in config.sections if item.id == next_id)
        return {
            "current_section": next_id,
            "current_question": section.question_ids[0] if section.question_ids else attempt["current_question"],
            "section_timers": timers,
            "remaining_time_seconds": timers[next_id]["remaining_seconds"],
        }

    def _event_summary(self, attempt_id: str) -> dict[str, Any]:
        events = self.store.list_events(attempt_id)
        hidden = [event for event in events if event["event_type"] == "TAB_HIDDEN"]
        visible = [event for event in events if event["event_type"] == "TAB_VISIBLE"]
        return {
            "tab_hidden_count": len(hidden),
            "tab_visible_count": len(visible),
            "recent": events[-20:],
        }
