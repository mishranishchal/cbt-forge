import os
import re
from pathlib import Path
from uuid import uuid4

from PIL import Image

from schemas.question import QuestionImage
from utils.files import MANAGED_IMAGE_DIR


IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}


class ImageValidationError(ValueError):
    pass


class ImageService:
    def max_size(self) -> int:
        return max(1, int(os.getenv("MAX_IMAGE_SIZE_MB", "10"))) * 1024 * 1024

    def store(self, content: bytes, filename: str, test_id: str, question_id: str = "unassigned", scope: str = "question", option_id: str | None = None) -> QuestionImage:
        suffix = Path(filename).suffix.lower()
        if suffix not in IMAGE_TYPES:
            raise ImageValidationError("Unsupported image type. Supported formats: PNG, JPG, JPEG, WEBP.")
        if not content:
            raise ImageValidationError("Image file is empty.")
        if len(content) > self.max_size():
            raise ImageValidationError(f"Image exceeds the {self.max_size() // 1024 // 1024} MB limit.")
        safe_test = re.sub(r"[^A-Za-z0-9_.-]", "_", test_id)
        safe_question = re.sub(r"[^A-Za-z0-9_.-]", "_", question_id)
        safe_scope = scope if scope in {"question", "explanation", "options", "imports"} else "question"
        if option_id:
            safe_scope = f"options/{re.sub(r'[^A-Za-z0-9_.-]', '_', option_id)}"
        image_id = f"img_{uuid4().hex}"
        output = MANAGED_IMAGE_DIR / safe_test / f"q_{safe_question}" / safe_scope / f"{image_id}{suffix}"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(content)
        try:
            with Image.open(output) as image:
                image.verify()
            with Image.open(output) as image:
                width, height = image.size
        except Exception as exc:
            output.unlink(missing_ok=True)
            raise ImageValidationError("Uploaded file is not a readable image.") from exc
        relative = output.relative_to(MANAGED_IMAGE_DIR.parent).as_posix()
        return QuestionImage(id=image_id, path=f"uploads/{relative}", filename=Path(filename).name[:180], mime_type=IMAGE_TYPES[suffix], width=width, height=height)
