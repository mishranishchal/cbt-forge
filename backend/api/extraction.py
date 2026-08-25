from fastapi import APIRouter, HTTPException

from schemas.extraction import ExtractRequest, ExtractResponse
from services.extraction_service import ExtractionService

router = APIRouter(prefix="/api", tags=["extraction"])


@router.post("/extract", response_model=ExtractResponse)
async def extract_questions(request: ExtractRequest) -> ExtractResponse:
    try:
        questions, summary = await ExtractionService().extract(request.test_id, request.use_demo)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc) or "Extraction failed. Please check the uploaded files.") from exc
    return ExtractResponse(
        test_id=request.test_id,
        status="complete",
        message="Extraction Complete",
        summary=summary,
        questions=questions,
    )
