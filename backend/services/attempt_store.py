import json
from datetime import datetime, timezone
from typing import Any

from db import get_connection, init_db


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class AttemptStore:
    def __init__(self) -> None:
        init_db()

    def insert_attempt(self, payload: dict[str, Any]) -> None:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO attempts (
                    id, test_id, start_time, end_time, status, current_section, current_question,
                    remaining_time_seconds, configuration_snapshot, question_snapshot, section_timers,
                    submission_reason, last_synced
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["id"],
                    payload["test_id"],
                    payload["start_time"],
                    payload.get("end_time"),
                    payload["status"],
                    payload.get("current_section"),
                    payload.get("current_question"),
                    payload.get("remaining_time_seconds", 0),
                    json.dumps(payload["configuration_snapshot"]),
                    json.dumps(payload["question_snapshot"]),
                    json.dumps(payload.get("section_timers") or {}),
                    payload.get("submission_reason"),
                    payload.get("last_synced") or utc_now(),
                ),
            )
            connection.commit()

    def get_attempt(self, attempt_id: str) -> dict[str, Any] | None:
        with get_connection() as connection:
            row = connection.execute("SELECT * FROM attempts WHERE id = ?", (attempt_id,)).fetchone()
        return self._attempt_from_row(row) if row else None

    def active_attempt(self, test_id: str) -> dict[str, Any] | None:
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM attempts WHERE test_id = ? AND status = 'IN_PROGRESS' ORDER BY start_time DESC LIMIT 1",
                (test_id,),
            ).fetchone()
        return self._attempt_from_row(row) if row else None

    def update_attempt(self, attempt_id: str, fields: dict[str, Any]) -> None:
        if not fields:
            return
        assignments = []
        values: list[Any] = []
        json_fields = {"configuration_snapshot", "question_snapshot", "section_timers"}
        for key, value in fields.items():
            assignments.append(f"{key} = ?")
            values.append(json.dumps(value) if key in json_fields else value)
        values.append(attempt_id)
        with get_connection() as connection:
            connection.execute(f"UPDATE attempts SET {', '.join(assignments)} WHERE id = ?", values)
            connection.commit()

    def list_history(self) -> list[dict[str, Any]]:
        with get_connection() as connection:
            rows = connection.execute("SELECT * FROM attempts ORDER BY start_time DESC").fetchall()
        return [self._attempt_from_row(row) for row in rows]

    def delete_attempt(self, attempt_id: str) -> None:
        with get_connection() as connection:
            connection.execute("DELETE FROM responses WHERE attempt_id = ?", (attempt_id,))
            connection.execute("DELETE FROM attempt_events WHERE attempt_id = ?", (attempt_id,))
            connection.execute("DELETE FROM results WHERE attempt_id = ?", (attempt_id,))
            connection.execute("DELETE FROM ai_analyses WHERE attempt_id = ?", (attempt_id,))
            connection.execute("DELETE FROM attempts WHERE id = ?", (attempt_id,))
            connection.commit()

    def upsert_response(self, attempt_id: str, question_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        existing = self.get_response(attempt_id, question_id)
        incoming_updated = payload.get("last_updated") or utc_now()
        if existing and existing.get("last_updated") and incoming_updated < existing["last_updated"]:
            return existing
        merged = {
            "attempt_id": attempt_id,
            "question_id": question_id,
            "selected_answers": payload.get("selected_answers", existing["selected_answers"] if existing else []),
            "visited": payload.get("visited", existing["visited"] if existing else False),
            "marked_for_review": payload.get("marked_for_review", existing["marked_for_review"] if existing else False),
            "status": payload.get("status") or (existing["status"] if existing else "NOT_VISITED"),
            "time_spent_seconds": payload.get("time_spent_seconds", existing["time_spent_seconds"] if existing else 0),
            "last_updated": incoming_updated,
        }
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO responses (
                    attempt_id, question_id, selected_answers, visited, marked_for_review, status, time_spent_seconds, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(attempt_id, question_id) DO UPDATE SET
                    selected_answers = excluded.selected_answers,
                    visited = excluded.visited,
                    marked_for_review = excluded.marked_for_review,
                    status = excluded.status,
                    time_spent_seconds = excluded.time_spent_seconds,
                    last_updated = excluded.last_updated
                """,
                (
                    attempt_id,
                    question_id,
                    json.dumps(merged["selected_answers"]),
                    int(merged["visited"]),
                    int(merged["marked_for_review"]),
                    merged["status"],
                    int(merged["time_spent_seconds"]),
                    merged["last_updated"],
                ),
            )
            connection.commit()
        return merged

    def get_response(self, attempt_id: str, question_id: str) -> dict[str, Any] | None:
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM responses WHERE attempt_id = ? AND question_id = ?",
                (attempt_id, question_id),
            ).fetchone()
        return self._response_from_row(row) if row else None

    def list_responses(self, attempt_id: str) -> list[dict[str, Any]]:
        with get_connection() as connection:
            rows = connection.execute("SELECT * FROM responses WHERE attempt_id = ?", (attempt_id,)).fetchall()
        return [self._response_from_row(row) for row in rows]

    def add_event(self, attempt_id: str, event_type: str, payload: dict[str, Any] | None = None) -> None:
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO attempt_events (attempt_id, event_type, timestamp, payload) VALUES (?, ?, ?, ?)",
                (attempt_id, event_type, utc_now(), json.dumps(payload or {})),
            )
            connection.commit()

    def list_events(self, attempt_id: str) -> list[dict[str, Any]]:
        with get_connection() as connection:
            rows = connection.execute(
                "SELECT * FROM attempt_events WHERE attempt_id = ? ORDER BY id",
                (attempt_id,),
            ).fetchall()
        return [
            {
                "id": row["id"],
                "attempt_id": row["attempt_id"],
                "event_type": row["event_type"],
                "timestamp": row["timestamp"],
                "payload": json.loads(row["payload"] or "{}"),
            }
            for row in rows
        ]

    def save_result(self, attempt_id: str, payload: dict[str, Any]) -> None:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO results (attempt_id, payload, created_at) VALUES (?, ?, ?)
                ON CONFLICT(attempt_id) DO UPDATE SET payload = excluded.payload
                """,
                (attempt_id, json.dumps(payload), utc_now()),
            )
            connection.commit()

    def get_result(self, attempt_id: str) -> dict[str, Any] | None:
        with get_connection() as connection:
            row = connection.execute("SELECT payload FROM results WHERE attempt_id = ?", (attempt_id,)).fetchone()
        return json.loads(row["payload"]) if row else None

    def save_ai_analysis(self, attempt_id: str, payload: dict[str, Any]) -> None:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO ai_analyses (attempt_id, payload, created_at) VALUES (?, ?, ?)
                ON CONFLICT(attempt_id) DO UPDATE SET payload = excluded.payload, created_at = excluded.created_at
                """,
                (attempt_id, json.dumps(payload), utc_now()),
            )
            connection.commit()

    def get_ai_analysis(self, attempt_id: str) -> dict[str, Any] | None:
        with get_connection() as connection:
            row = connection.execute("SELECT payload FROM ai_analyses WHERE attempt_id = ?", (attempt_id,)).fetchone()
        return json.loads(row["payload"]) if row else None

    def _attempt_from_row(self, row: Any) -> dict[str, Any]:
        return {
            "id": row["id"],
            "test_id": row["test_id"],
            "start_time": row["start_time"],
            "end_time": row["end_time"],
            "status": row["status"],
            "current_section": row["current_section"],
            "current_question": row["current_question"],
            "remaining_time_seconds": row["remaining_time_seconds"],
            "configuration_snapshot": json.loads(row["configuration_snapshot"]),
            "question_snapshot": json.loads(row["question_snapshot"]),
            "section_timers": json.loads(row["section_timers"] or "{}"),
            "submission_reason": row["submission_reason"],
            "last_synced": row["last_synced"],
        }

    def _response_from_row(self, row: Any) -> dict[str, Any]:
        return {
            "attempt_id": row["attempt_id"],
            "question_id": row["question_id"],
            "selected_answers": json.loads(row["selected_answers"] or "[]"),
            "visited": bool(row["visited"]),
            "marked_for_review": bool(row["marked_for_review"]),
            "status": row["status"],
            "time_spent_seconds": row["time_spent_seconds"],
            "last_updated": row["last_updated"],
        }
