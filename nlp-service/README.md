# nlp-service

Service แยกส่วนสำหรับระบบจัดการนักศึกษาฝึกงาน/สหกิจ ภาควิชาเทคโนโลยีสารสนเทศ
รับผิดชอบ 2 ฟีเจอร์ (ทั้งคู่เป็น classic NLP/ML **ไม่ใช้ LLM**):

1. **Resume Matching** — จับคู่ resume/ประวัตินักศึกษา กับตำแหน่งงานของบริษัท ด้วย TF-IDF + cosine similarity
2. **Chatbot** — ตอบคำถามเกี่ยวกับเว็บไซต์นี้เท่านั้น (ขั้นตอนขอฝึกงาน, เอกสารที่ต้องใช้, สถานะคำร้อง ฯลฯ) ด้วย intent classification (TF-IDF + Logistic Regression) + retrieval คำตอบสำเร็จรูป

## โครงสร้างโปรเจกต์

```
nlp-service/
├── app/
│   ├── main.py                 # FastAPI entry point
│   ├── api/v1/                 # endpoint layer (บาง, รับ request/response เท่านั้น)
│   ├── core/                   # config, logging
│   ├── schemas/                # pydantic request/response models
│   ├── services/                # เชื่อม endpoint กับ nlp logic
│   ├── nlp/                     # โค้ด NLP ล้วน ๆ ไม่ผูกกับ FastAPI
│   │   ├── common/              # preprocessing ที่ใช้ร่วมกัน
│   │   ├── matching/            # resume matching
│   │   └── chatbot/              # intent classifier + response selector
│   └── utils/
├── data/
│   ├── raw/                    # ข้อมูลดิบ (ไม่ commit ไฟล์จริง)
│   ├── processed/chatbot/       # faq_seed.json — ชุดข้อมูลเทรน chatbot (commit ได้ เป็นตัวอย่าง)
│   ├── models/                  # โมเดลที่ save ไว้ (ไม่ commit)
│   └── embeddings/               # vector cache (ไม่ commit)
└── tests/
```

## Setup (รันเครื่องตัวเอง ไม่ใช้ Docker)

```bash
cd nlp-service
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # ปรับค่าตามต้องการ

uvicorn app.main:app --reload --port 8000
```

เปิด http://localhost:8000/docs เพื่อดู Swagger UI และทดสอบ endpoint

## รันผ่าน Docker Compose (พร้อม postgres/backend/frontend)

จาก root ของ monorepo (`fitm-intern/`):

```bash
docker compose up --build nlp-service
```

หรือรันทั้งระบบ:

```bash
docker compose up --build
```

nlp-service จะพร้อมใช้งานที่ `http://localhost:8000`

## รัน test

```bash
pytest
```

## Endpoint หลัก

| Method | Path                    | คำอธิบาย                          |
|--------|--------------------------|-------------------------------------|
| GET    | `/health`                 | health check                        |
| POST   | `/api/v1/resume-match`    | จับคู่ resume กับตำแหน่งงาน         |
| POST   | `/api/v1/chat`             | ถามตอบเกี่ยวกับเว็บไซต์             |

### ตัวอย่าง request `/api/v1/chat`

```json
{ "message": "ต้องเตรียมเอกสารอะไรบ้าง" }
```

### เพิ่มข้อมูลสอน chatbot

แก้ไข `data/processed/chatbot/faq_seed.json` เพิ่ม intent ใหม่หรือเพิ่มตัวอย่างประโยคในแต่ละ intent เดิม
แล้ว restart service (เทรนโมเดลใหม่อัตโนมัติตอน startup ไม่ต้องรันสคริปต์แยก)
