from pathlib import Path

from schemas.attempt import ResponseUpdate, SubmissionReason
from services.cbt_service import CbtService
from services.demo_cbt_service import ensure_demo_test
from services.export_service import ExportService


def test_attempt_submission_is_idempotent_and_exports_work() -> None:
    test_id = ensure_demo_test()
    cbt = CbtService()
    attempt = cbt.create_attempt(test_id, resume_if_active=False)
    question = attempt["questions"][0]
    cbt.save_response(
        attempt["attempt_id"],
        question["id"],
        ResponseUpdate(selected_answers=["B"], visited=True, time_spent_seconds=12),
    )
    first = cbt.submit(attempt["attempt_id"], SubmissionReason.manual)
    second = cbt.submit(attempt["attempt_id"], SubmissionReason.manual)
    assert first["attempt_id"] == second["attempt_id"]
    assert first["scoring"]["attempted"] >= 1

    exporter = ExportService()
    payload = exporter.export_json(attempt["attempt_id"])
    assert payload["attempt_id"] == attempt["attempt_id"]
    assert "<html" in exporter.export_html(attempt["attempt_id"]).lower()
    assert exporter.export_pdf(attempt["attempt_id"]).startswith(b"%PDF")


def test_timer_does_not_reset_on_refresh() -> None:
    test_id = ensure_demo_test()
    cbt = CbtService()
    attempt = cbt.create_attempt(test_id, resume_if_active=False)
    before = attempt["remaining_time_seconds"]
    refreshed = cbt.get_attempt(attempt["attempt_id"])
    assert refreshed["remaining_time_seconds"] <= before
    assert refreshed["attempt_id"] == attempt["attempt_id"]


def test_retake_creates_new_attempt() -> None:
    test_id = ensure_demo_test()
    cbt = CbtService()
    attempt = cbt.create_attempt(test_id, resume_if_active=False)
    cbt.submit(attempt["attempt_id"], SubmissionReason.manual)
    retake = cbt.retake(attempt["attempt_id"])
    assert retake["attempt_id"] != attempt["attempt_id"]
    assert retake["test_id"] == test_id
