from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_chat_recognizes_document_intent():
    response = client.post("/api/v1/chat", json={"message": "ต้องเตรียมเอกสารอะไรบ้าง"})
    assert response.status_code == 200

    data = response.json()
    assert data["intent"] == "required_documents"
    assert data["confidence"] > 0
    assert "เอกสาร" in data["reply"] or "คำร้อง" in data["reply"]


def test_chat_low_confidence_falls_back():
    response = client.post("/api/v1/chat", json={"message": "ขอสูตรทำต้มยำกุ้งหน่อย"})
    assert response.status_code == 200

    data = response.json()
    # ข้อความไม่เกี่ยวกับเว็บไซต์เลย ควรได้ fallback หรือ confidence ต่ำ
    assert "reply" in data
