import fitz
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO

from app.main import app

client = TestClient(app, raise_server_exceptions=False)


def test_invalid_pdf_is_rejected_without_internal_details():
    response = client.post(
        "/api/v1/resume-ocr",
        files={"file": ("resume.pdf", b"not a PDF", "application/pdf")},
    )
    assert response.status_code == 400
    assert "traceback" not in response.text.lower()
    assert "app/" not in response.text.lower()


def test_ocr_page_limit_is_five():
    document = fitz.open()
    for _ in range(6):
        document.new_page()
    pdf_bytes = document.tobytes()
    document.close()

    response = client.post(
        "/api/v1/resume-ocr",
        files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    assert response.json()["page_count"] == 5
    assert response.json()["method"] == "ocr"
    assert len(response.json()["text"]) <= 20_000


def test_ocr_reads_text_from_a_small_scanned_pdf():
    image = Image.new("RGB", (1200, 300), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 76)
    draw.text((120, 90), "PYTHON SQL", fill="black", font=font)
    image_bytes = BytesIO()
    image.save(image_bytes, format="PNG")

    document = fitz.open()
    page = document.new_page(width=612, height=153)
    page.insert_image(page.rect, stream=image_bytes.getvalue())
    pdf_bytes = document.tobytes()
    document.close()

    response = client.post(
        "/api/v1/resume-ocr",
        files={"file": ("scanned-resume.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    assert "PYTHON" in response.json()["text"].upper()
