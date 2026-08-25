from io import BytesIO

import pytest
from PIL import Image

from services.export_service import ExportService, image_data_uri
from services.image_service import ImageService, ImageValidationError
from services.question_normalizer import normalize_question
from services.validation_service import ValidationService


def png_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (12, 8), "white").save(output, format="PNG")
    return output.getvalue()


def store_asset() -> object:
    return ImageService().store(png_bytes(), "diagram.png", "asset_tests", "q1", "question")


def test_json_without_images_or_explanation_is_valid_shape() -> None:
    question = normalize_question({"question_text": "2 + 2?", "options": ["3", "4"], "answer": "B", "explanation": None}, 1)
    assert question.question_images == []
    assert question.explanation is None


def test_question_option_and_explanation_images_resolve_in_order() -> None:
    first = store_asset()
    second = ImageService().store(png_bytes(), "second.png", "asset_tests", "q1", "question")
    index = {first.filename.casefold(): first, second.filename.casefold(): second}
    question = normalize_question({"question_text": "Figure?", "question_images": [{"filename": "diagram.png"}, {"filename": "second.png"}], "options": [{"id": "A", "text": "", "images": [{"filename": "diagram.png"}]}, {"id": "B", "text": "Two"}], "answer": "B", "explanation": {"text": "See solution.", "images": [{"filename": "second.png"}]}}, 1, asset_index=index)
    assert [image.id for image in question.question_images] == [first.id, second.id]
    assert question.options[0].images[0].id == first.id
    assert question.explanation and question.explanation.images[0].id == second.id


def test_missing_referenced_image_is_a_question_warning() -> None:
    question = normalize_question({"question_text": "Figure?", "question_images": [{"filename": "missing.png"}], "options": ["A", "B"], "answer": "A"}, 1)
    validated = ValidationService().validate_questions([question])[0]
    assert validated.validation_status == "warning"
    assert "Referenced image not found: missing.png" in validated.warnings


def test_invalid_oversized_and_unsupported_uploads_are_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    service = ImageService()
    with pytest.raises(ImageValidationError, match="Unsupported"):
        service.store(b"x", "diagram.gif", "asset_tests")
    with pytest.raises(ImageValidationError, match="readable"):
        service.store(b"not an image", "diagram.png", "asset_tests")
    monkeypatch.setenv("MAX_IMAGE_SIZE_MB", "1")
    with pytest.raises(ImageValidationError, match="limit"):
        service.store(b"x" * (1024 * 1024 + 1), "large.png", "asset_tests")


def test_duplicate_image_references_warn_and_export_paths_are_portable() -> None:
    asset = store_asset()
    question = normalize_question({"question_text": "Figure?", "question_images": [{"filename": "diagram.png"}, {"filename": "diagram.png"}], "options": ["A", "B"], "answer": "A"}, 1, asset_index={asset.filename.casefold(): asset})
    validated = ValidationService().validate_questions([question])[0]
    assert "Duplicate image reference." in validated.warnings
    exported = ExportService()._portable_question(question.model_dump(mode="json"))
    assert exported["question_images"][0]["path"].startswith("uploads/")
    assert image_data_uri(asset.path).startswith("data:image/png;base64,")
