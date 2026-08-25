import re

from fastapi import HTTPException

ID_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")


def validate_id(value: str, label: str = "ID") -> str:
    if not ID_PATTERN.fullmatch(value or ""):
        raise HTTPException(status_code=400, detail=f"Invalid {label}.")
    return value
