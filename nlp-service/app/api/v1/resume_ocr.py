from io import BytesIO
import re

import fitz
import pytesseract
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

router = APIRouter(prefix="/resume-ocr", tags=["resume-ocr"])
MAX_PDF_BYTES = 10 * 1024 * 1024
MAX_OCR_PAGES = 5
MAX_TEXT_CHARS = 20_000


def normalize_text(value: str) -> str:
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", value)
    return re.sub(r"\s+", " ", value).strip()[:MAX_TEXT_CHARS]


@router.post("")
async def post_resume_ocr(file: UploadFile = File(...)):
    if file.content_type != "application/pdf" or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="A PDF file is required")
    data = await file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds 10 MB")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Invalid PDF")
    try:
        with fitz.open(stream=data, filetype="pdf") as document:
            if document.is_encrypted:
                raise HTTPException(status_code=400, detail="Encrypted PDF is not supported")
            page_count = min(document.page_count, MAX_OCR_PAGES)
            pieces = []
            for page in document[:MAX_OCR_PAGES]:
                pixmap = page.get_pixmap(dpi=150, alpha=False)
                image = Image.open(BytesIO(pixmap.tobytes("png")))
                pieces.append(pytesseract.image_to_string(image, lang="tha+eng"))
            text = normalize_text(" ".join(pieces))
            return {"text": text, "method": "ocr", "page_count": page_count}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to process PDF") from None
