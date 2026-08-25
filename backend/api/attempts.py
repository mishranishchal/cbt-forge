from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, Response

from schemas.attempt import AttemptEventCreate, CreateAttemptRequest, ResponseUpdate, SubmitRequest
from services.ai_service import AI_BUSY_MESSAGE, AI_DISABLED_MESSAGE, AIServiceError, OpenRouterProvider
from services.analytics_service import analysis_for_ai
from services.attempt_store import AttemptStore
from services.cbt_service import CbtService
from services.demo_cbt_service import ensure_demo_test
from services.export_service import ExportService
from services.question_bank_service import QuestionBankService
from utils.files import TEST_DIR, read_json
from utils.ids import validate_id

router = APIRouter(prefix="/api", tags=["cbt"])
cbt = CbtService()
exporter = ExportService()


@router.post("/demo")
async def create_demo() -> dict:
    test_id = ensure_demo_test()
    return {"test_id": test_id, "route": f"/test/{test_id}"}


@router.get("/tests")
async def list_tests() -> list[dict]:
    items = []
    if not TEST_DIR.exists():
        return items
    for directory in sorted(TEST_DIR.iterdir()):
        if not directory.is_dir():
            continue
        payload = {"test_id": directory.name, "title": directory.name, "status": "ready"}
        test_path = directory / "test.json"
        if test_path.exists():
            payload.update({key: value for key, value in read_json(test_path).items() if key in {"test_id", "title", "status", "demo"}})
        payload["has_questions"] = (directory / "questions.json").exists()
        payload["has_configuration"] = (directory / "configuration.json").exists()
        items.append(payload)
    return items


@router.post("/tests/{test_id}/attempts")
async def create_attempt(test_id: str, payload: CreateAttemptRequest | None = None) -> dict:
    validate_id(test_id, "test ID")
    request = payload or CreateAttemptRequest()
    return cbt.create_attempt(test_id, resume_if_active=request.resume_if_active)


@router.get("/attempts/{attempt_id}")
async def get_attempt(attempt_id: str) -> dict:
    validate_id(attempt_id, "attempt ID")
    return cbt.get_attempt(attempt_id)


@router.post("/attempts/{attempt_id}/responses")
async def save_responses(attempt_id: str, payload: dict) -> dict:
    validate_id(attempt_id, "attempt ID")
    updates = payload.get("responses") or payload.get("items") or []
    if isinstance(payload.get("question_id"), str):
        updates = [payload]
    saved = cbt.save_responses_batch(
        attempt_id,
        updates if isinstance(updates, list) else [],
        current_section=payload.get("current_section"),
        current_question=payload.get("current_question"),
    )
    return {"responses": saved}


@router.put("/attempts/{attempt_id}/responses/{question_id}")
async def save_response(attempt_id: str, question_id: str, update: ResponseUpdate) -> dict:
    validate_id(attempt_id, "attempt ID")
    validate_id(question_id, "question ID")
    return cbt.save_response(attempt_id, question_id, update)


@router.post("/attempts/{attempt_id}/events")
async def record_event(attempt_id: str, event: AttemptEventCreate) -> dict:
    validate_id(attempt_id, "attempt ID")
    return cbt.add_event(attempt_id, event)


@router.post("/attempts/{attempt_id}/submit")
async def submit_attempt(attempt_id: str, payload: SubmitRequest | None = None) -> dict:
    validate_id(attempt_id, "attempt ID")
    request = payload or SubmitRequest()
    return cbt.submit(attempt_id, request.reason, request.current_section, request.current_question)


@router.get("/attempts/{attempt_id}/result")
async def get_result(attempt_id: str) -> dict:
    validate_id(attempt_id, "attempt ID")
    return cbt.get_result(attempt_id)


@router.get("/attempts/{attempt_id}/analysis")
async def get_analysis(attempt_id: str) -> dict:
    validate_id(attempt_id, "attempt ID")
    result = cbt.get_result(attempt_id)
    return {
        "scoring": result["scoring"],
        "analytics": result["analytics"],
        "ai_analysis": result.get("ai_analysis"),
        "time_used_seconds": result.get("time_used_seconds"),
    }


@router.post("/attempts/{attempt_id}/ai-analysis")
async def generate_ai_analysis(attempt_id: str) -> dict:
    validate_id(attempt_id, "attempt ID")
    result = cbt.get_result(attempt_id)
    statistics = analysis_for_ai(result["scoring"], result["analytics"], int(result.get("time_used_seconds") or 0))
    try:
        analysis = await OpenRouterProvider().generate_performance_review(statistics)
    except AIServiceError as exc:
        raise HTTPException(status_code=503, detail=AI_DISABLED_MESSAGE if str(exc) == AI_DISABLED_MESSAGE else AI_BUSY_MESSAGE) from exc
    AttemptStore().save_ai_analysis(attempt_id, analysis)
    return analysis


@router.post("/questions/{question_id}/generate-explanation")
async def generate_explanation(question_id: str) -> dict:
    validate_id(question_id, "question ID")
    bank = QuestionBankService()
    question: dict | None = None
    test_id = bank.find_test_id_for_question(question_id)
    if test_id:
        found = next((item for item in bank.load(test_id) if item.id == question_id), None)
        if found:
            question = found.model_dump(mode="json")
    if question is None:
        for attempt in AttemptStore().list_history():
            for item in attempt["question_snapshot"]:
                if item.get("id") == question_id:
                    question = item
                    break
            if question:
                break
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    try:
        generated = await OpenRouterProvider().generate_explanation(question)
    except AIServiceError as exc:
        raise HTTPException(status_code=503, detail=AI_DISABLED_MESSAGE if str(exc) == AI_DISABLED_MESSAGE else AI_BUSY_MESSAGE) from exc
    original = question.get("explanation")
    saved = False
    if not original and test_id:
        text = f"[AI-generated explanation]\n{generated.get('concept','')}\n{generated.get('steps','')}\nFinal answer: {generated.get('final_answer','')}"
        bank.update_question(question_id, {"explanation": text})
        saved = True
    return {**generated, "original_explanation": original, "saved_to_question": saved}


@router.get("/history")
async def history() -> list[dict]:
    return cbt.history()


@router.post("/attempts/{attempt_id}/retake")
async def retake(attempt_id: str) -> dict:
    validate_id(attempt_id, "attempt ID")
    return cbt.retake(attempt_id)


@router.delete("/attempts/{attempt_id}")
async def delete_attempt(attempt_id: str) -> dict:
    validate_id(attempt_id, "attempt ID")
    cbt.delete_attempt(attempt_id)
    return {"status": "deleted"}


@router.get("/attempts/{attempt_id}/export/json")
async def export_json(attempt_id: str) -> JSONResponse:
    validate_id(attempt_id, "attempt ID")
    payload = exporter.export_json(attempt_id)
    return JSONResponse(payload, headers={"Content-Disposition": f'attachment; filename="{attempt_id}.json"'})


@router.get("/attempts/{attempt_id}/export/html")
async def export_html(attempt_id: str) -> HTMLResponse:
    validate_id(attempt_id, "attempt ID")
    return HTMLResponse(exporter.export_html(attempt_id), headers={"Content-Disposition": f'attachment; filename="{attempt_id}.html"'})


@router.get("/attempts/{attempt_id}/export/pdf")
async def export_pdf(attempt_id: str) -> Response:
    validate_id(attempt_id, "attempt ID")
    data = exporter.export_pdf(attempt_id)
    return Response(content=data, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{attempt_id}.pdf"'})
