from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from schemas.extraction import FileRole, TextPayload, UploadedFileRecord, UploadResponse
from services.image_service import IMAGE_TYPES, ImageService, ImageValidationError
from utils.files import UPLOAD_DIR, ensure_data_dirs, new_test_id, test_dir, write_json

router = APIRouter(prefix="/api", tags=["upload"])

MAX_FILE_SIZE = 20 * 1024 * 1024
SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".json", *IMAGE_TYPES}


@router.post("/upload", response_model=UploadResponse)
async def upload_files(
    files: list[UploadFile] = File(default=[]),
    roles: list[FileRole] = Form(default=[]),
    question_text: str | None = Form(default=None),
    answer_key_text: str | None = Form(default=None),
    explanation_text: str | None = Form(default=None),
) -> UploadResponse:
    ensure_data_dirs()
    test_id = new_test_id()
    saved_files: list[UploadedFileRecord] = []
    upload_root = UPLOAD_DIR / test_id
    upload_root.mkdir(parents=True, exist_ok=True)

    for index, upload in enumerate(files):
        if not upload.filename or Path(upload.filename).suffix.lower() not in SUPPORTED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Unsupported file type. Supported formats: PDF, TXT, JSON.")
        content = await upload.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Uploaded file is too large for development mode.")
        role = roles[index] if index < len(roles) else FileRole.other
        safe_name = Path(upload.filename).name
        suffix = Path(safe_name).suffix.lower()
        image_asset = None
        if suffix in IMAGE_TYPES:
            try:
                image_asset = ImageService().store(content, safe_name, test_id, "imports", "imports")
                output_path = Path(image_asset.path)
            except ImageValidationError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
        else:
            output_path = upload_root / safe_name
            output_path.write_bytes(content)
        saved_files.append(
            UploadedFileRecord(
                id=f"file_{index + 1:03d}",
                filename=safe_name,
                role=role,
                path=str(output_path),
                size=len(content),
                image_asset=image_asset,
            )
        )

    text = TextPayload(question_text=question_text, answer_key_text=answer_key_text, explanation_text=explanation_text)
    response = UploadResponse(test_id=test_id, files=saved_files, text=text)
    write_json(test_dir(test_id) / "upload.json", response.model_dump(mode="json"))
    return response
