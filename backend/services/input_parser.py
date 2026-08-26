from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from services.json_service import parse_json_document
from services.ocr_service import OCRService, OCRUnavailableError
from services.pdf_service import extract_images, get_page_count, render_page
from services.text_service import parse_text


class InputValidationError(ValueError):
    pass


@dataclass
class ParsedInput:
    kind: str
    raw_questions: list[dict[str, Any]] = field(default_factory=list)
    page_questions: list[tuple[int, list[dict[str, Any]]]] = field(default_factory=list)
    text: str = ""
    images: list[dict[str, Any]] = field(default_factory=list)
    pages_total: int = 0
    pages_processed: int = 0
    pages_ocr: int = 0
    pages_failed: int = 0
    warnings: list[str] = field(default_factory=list)
    test_metadata: dict[str, Any] = field(default_factory=dict)


def parse_input(file_path: str | Path, test_id: str | None = None) -> ParsedInput:
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == ".txt":
        try:
            text = path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError:
            text = path.read_text(encoding="latin-1")
        return ParsedInput(kind="txt", raw_questions=parse_text(text), text=text)
    if suffix == ".json":
        questions, test_metadata = parse_json_document(path)
        return ParsedInput(kind="json", raw_questions=questions, test_metadata=test_metadata)
    if suffix != ".pdf":
        raise InputValidationError("Unsupported file type. Supported formats: PDF, TXT, JSON.")
    return _parse_pdf(path, test_id)


def _parse_pdf(path: Path, test_id: str | None) -> ParsedInput:
    import fitz

    result = ParsedInput(kind="pdf")
    ocr = OCRService()
    try:
        result.pages_total = get_page_count(path)
        document = fitz.open(path)
    except Exception as exc:
        raise InputValidationError(f"Unable to read PDF: {exc}") from exc
    try:
        for page_number in range(1, result.pages_total + 1):
            try:
                page = document.load_page(page_number - 1)
                page_text = page.get_text("text").strip()
                image_count = len(page.get_images(full=True))
                if len(page_text) < 30 and image_count:
                    result.pages_ocr += 1
                    try:
                        page_text = ocr.extract_text_from_image(render_page(path, page_number, test_id)) or page_text
                    except OCRUnavailableError as exc:
                        if str(exc) not in result.warnings:
                            result.warnings.append(str(exc))
                result.text += ("\n\n" if result.text else "") + page_text
                result.page_questions.append((page_number, parse_text(page_text)))
                result.pages_processed += 1
            except Exception:
                result.pages_failed += 1
                result.warnings.append(f"Page {page_number} could not be fully processed.")
    finally:
        document.close()
    try:
        result.images = extract_images(path, test_id)
    except Exception:
        result.warnings.append("Embedded images could not be fully extracted.")
    return result
