import json
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
EXTRACTED_IMAGE_DIR = DATA_DIR / "extracted_images"
MANAGED_IMAGE_DIR = UPLOAD_DIR / "images"
TEST_DIR = DATA_DIR / "tests"


def ensure_data_dirs() -> None:
    for directory in (UPLOAD_DIR, EXTRACTED_IMAGE_DIR, MANAGED_IMAGE_DIR, TEST_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def new_test_id() -> str:
    return f"test_{uuid4().hex[:12]}"


def slugify_filename(filename: str) -> str:
    stem = Path(filename).stem.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")
    return slug or "document"


def test_dir(test_id: str) -> Path:
    ensure_data_dirs()
    path = TEST_DIR / test_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))
