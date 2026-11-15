from pathlib import Path

from django.core.exceptions import ValidationError

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MATERIAL_EXT = {".pdf", ".doc", ".docx", ".ppt", ".pptx"}
SUBMISSION_EXT = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".zip"}
MAX_IMAGE = 2 * 1024 * 1024
MAX_FILE = 15 * 1024 * 1024


def _check(file, allowed, max_size):
    if not file:
        return
    if file.size > max_size:
        raise ValidationError(f"File must be {max_size // (1024 * 1024)} MB or smaller.")
    ext = Path(file.name).suffix.lower()
    if ext not in allowed:
        raise ValidationError(f"Allowed types: {', '.join(sorted(allowed))}.")
    head = file.read(8)
    try:
        file.seek(0)
    except Exception:
        pass
    if ext == ".pdf" and not head.startswith(b"%PDF"):
        raise ValidationError("The PDF file is not valid.")
    if ext in IMAGE_EXT and not (
        head.startswith(b"\xff\xd8\xff") or head.startswith(b"\x89PNG") or head.startswith(b"RIFF")
    ):
        raise ValidationError("The image file is not valid.")


def validate_image(file):
    _check(file, IMAGE_EXT, MAX_IMAGE)


def validate_material(file):
    _check(file, MATERIAL_EXT, MAX_FILE)


def validate_submission(file):
    _check(file, SUBMISSION_EXT, MAX_FILE)
