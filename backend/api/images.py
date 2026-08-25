from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from schemas.question import QuestionImage
from services.image_service import ImageService, ImageValidationError

router = APIRouter(prefix="/api/images", tags=["images"])


@router.post("/upload", response_model=QuestionImage)
async def upload_image(file: UploadFile = File(...), test_id: str = Form(...), question_id: str = Form("unassigned"), scope: str = Form("question"), option_id: str | None = Form(default=None)) -> QuestionImage:
    if file.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=400, detail="Unsupported image MIME type. Supported formats: PNG, JPG, JPEG, WEBP.")
    try:
        return ImageService().store(await file.read(), file.filename or "image", test_id, question_id, scope, option_id)
    except ImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
