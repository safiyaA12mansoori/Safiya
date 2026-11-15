from pathlib import Path


def extract_pdf(file):
    from pypdf import PdfReader

    reader = PdfReader(file)
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def extract_docx(file):
    from docx import Document

    return "\n".join(paragraph.text for paragraph in Document(file).paragraphs)


def extract_ppt(file):
    from pptx import Presentation

    chunks = []
    for slide in Presentation(file).slides:
        for shape in slide.shapes:
            if getattr(shape, "has_text_frame", False):
                chunks.append(shape.text)
    return "\n".join(chunks)


def extract_upload(uploaded):
    name = Path(uploaded.name).suffix.lower()
    if name == ".pdf":
        return extract_pdf(uploaded)
    if name == ".docx":
        return extract_docx(uploaded)
    if name in {".ppt", ".pptx"}:
        return extract_ppt(uploaded)
    return ""


def extract_material(material):
    if material.file:
        try:
            material.file.open("rb")
            text = extract_upload(material.file)
            material.file.close()
            if text.strip():
                return text
        except Exception:
            return material.description or ""
    return "\n".join(part for part in (material.title, material.description) if part)
