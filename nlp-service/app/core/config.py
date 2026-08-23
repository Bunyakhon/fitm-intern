"""
ค่า config กลางของ nlp-service
โหลดจาก environment variable (.env) ผ่าน pydantic-settings
"""
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # nlp-service/


class Settings(BaseSettings):
    APP_NAME: str = "nlp-service"
    PORT: int = 8000

    # path ข้อมูล/โมเดล (แยกจากโค้ดใน app/ ตามที่ตกลงกันไว้ในโครงสร้าง)
    DATA_DIR: Path = BASE_DIR / "data"
    RAW_DIR: Path = DATA_DIR / "raw"
    PROCESSED_DIR: Path = DATA_DIR / "processed"
    MODELS_DIR: Path = DATA_DIR / "models"
    EMBEDDINGS_DIR: Path = DATA_DIR / "embeddings"

    # resume matching
    MATCHING_TOP_K: int = 5
    MATCHING_MIN_SCORE: float = 0.05  # คะแนน similarity ต่ำกว่านี้ถือว่าไม่ match

    # chatbot
    CHATBOT_FAQ_FILE: Path = DATA_DIR / "processed" / "chatbot" / "faq_seed.json"
    CHATBOT_MIN_CONFIDENCE: float = 0.35  # ต่ำกว่านี้ตอบ fallback แทน

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
