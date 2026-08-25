from pathlib import Path
from typing import Any

import fitz

from utils.files import EXTRACTED_IMAGE_DIR, slugify_filename


def extract_pdf_text(path: str | Path) -> str:
    with fitz.open(path) as document:
        return "\n\n".join(page.get_text("text") for page in document)


def extract_page_text(path: str | Path, page_number: int) -> str:
    with fitz.open(path) as document:
        page = document.load_page(page_number - 1)
        return page.get_text("text")


def get_page_count(path: str | Path) -> int:
    with fitz.open(path) as document:
        return document.page_count


def get_page_metadata(path: str | Path) -> list[dict[str, Any]]:
    metadata: list[dict[str, Any]] = []
    with fitz.open(path) as document:
        for index, page in enumerate(document, start=1):
            images = page.get_images(full=True)
            dimensions = []
            for image in images:
                xref = image[0]
                try:
                    pixmap = fitz.Pixmap(document, xref)
                    dimensions.append({"width": pixmap.width, "height": pixmap.height})
                except Exception:
                    dimensions.append({"width": None, "height": None})
            metadata.append(
                {
                    "page_number": index,
                    "text_length": len(page.get_text("text").strip()),
                    "image_count": len(images),
                    "image_dimensions": dimensions,
                }
            )
    return metadata


def extract_images(path: str | Path, test_id: str | None = None) -> list[dict[str, Any]]:
    source = Path(path)
    slug = slugify_filename(source.name)
    prefix = f"{test_id}_{slug}" if test_id else slug
    saved: list[dict[str, Any]] = []
    EXTRACTED_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    with fitz.open(source) as document:
        for page_index, page in enumerate(document, start=1):
            for image_index, image in enumerate(page.get_images(full=True), start=1):
                xref = image[0]
                extracted = document.extract_image(xref)
                ext = extracted.get("ext", "png")
                filename = f"{prefix}_page{page_index:02d}_img{image_index:02d}.{ext}"
                output_path = EXTRACTED_IMAGE_DIR / filename
                output_path.write_bytes(extracted["image"])
                saved.append(
                    {
                        "path": str(output_path),
                        "page_number": page_index,
                        "type": "embedded_image",
                        "width": extracted.get("width"),
                        "height": extracted.get("height"),
                    }
                )
    return saved


def render_page(path: str | Path, page_number: int, test_id: str | None = None, dpi: int = 180) -> str:
    source = Path(path)
    slug = slugify_filename(source.name)
    prefix = f"{test_id}_{slug}" if test_id else slug
    EXTRACTED_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    output_path = EXTRACTED_IMAGE_DIR / f"{prefix}_page{page_number:02d}_render.png"
    with fitz.open(source) as document:
        page = document.load_page(page_number - 1)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72), alpha=False)
        pixmap.save(output_path)
    return str(output_path)
