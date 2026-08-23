FROM python:3.11-slim

WORKDIR /app

# ติดตั้ง dependency ก่อน copy โค้ด เพื่อให้ docker cache layer นี้ไว้ (build เร็วขึ้นเวลาแก้แค่โค้ด)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
