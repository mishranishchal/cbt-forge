from pathlib import Path
from uuid import uuid4

import fitz
from PIL import Image
from reportlab.pdfgen import canvas

from services.pdf_service import extract_images, extract_pdf_text, get_page_count, get_page_metadata, render_page
from utils.files import TEST_DIR


def create_text_pdf(path: Path, text: str) -> None:
    pdf = canvas.Canvas(str(path))
    pdf.drawString(72, 720, text)
    pdf.save()


def unit_dir() -> Path:
    path = TEST_DIR / f"unit_{uuid4().hex[:8]}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def test_normal_pdf_extraction() -> None:
    path = unit_dir() / "questions.pdf"
    create_text_pdf(path, "Q1. What is 2 + 2? A. 3 B. 4")
    assert get_page_count(path) == 1
    assert "What is 2 + 2" in extract_pdf_text(path)


def test_empty_pdf() -> None:
    path = unit_dir() / "empty.pdf"
    document = fitz.open()
    document.new_page()
    document.save(path)
    document.close()
    assert extract_pdf_text(path).strip() == ""
    metadata = get_page_metadata(path)
    assert metadata[0]["text_length"] == 0


def test_image_pdf_extraction_and_render() -> None:
    directory = unit_dir()
    image_path = directory / "source.png"
    Image.new("RGB", (80, 40), color="white").save(image_path)
    pdf_path = directory / "image.pdf"
    document = fitz.open()
    page = document.new_page()
    page.insert_image(fitz.Rect(72, 72, 200, 150), filename=image_path)
    document.save(pdf_path)
    document.close()

    metadata = get_page_metadata(pdf_path)
    assert metadata[0]["image_count"] == 1
    assert extract_images(pdf_path, "pytest")
    rendered = render_page(pdf_path, 1, "pytest")
    assert Path(rendered).exists()
