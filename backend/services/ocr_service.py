from pathlib import Path


class OCRUnavailableError(RuntimeError):
    pass


class OCRService:
    def __init__(self) -> None:
        try:
            import pytesseract  # type: ignore
            from PIL import Image  # type: ignore
        except Exception as exc:
            self._pytesseract = None
            self._image = None
            self._error = exc
        else:
            self._pytesseract = pytesseract
            self._image = Image
            self._error = None

    def extract_text_from_image(self, image_path: str | Path) -> str:
        if self._pytesseract is None or self._image is None:
            raise OCRUnavailableError("Local OCR is not installed. Image-only pages could not be read.") from self._error
        try:
            with self._image.open(image_path) as image:
                return self._pytesseract.image_to_string(image).strip()
        except Exception as exc:
            raise OCRUnavailableError(f"OCR failed for {image_path}: {exc}") from exc
