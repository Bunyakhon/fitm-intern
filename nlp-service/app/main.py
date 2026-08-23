from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1 import chatbot, resume_matching
from app.core.config import settings
from app.core.logging import get_logger, setup_logging
from app.nlp.chatbot.intent_classifier import intent_classifier

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # เทรน intent classifier ตอน startup (เบา ใช้เวลาไม่ถึงวินาที)
    logger.info("Training chatbot intent classifier from %s", settings.CHATBOT_FAQ_FILE)
    intent_classifier.load_and_train()
    logger.info("nlp-service ready.")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Resume matching + chatbot สำหรับระบบจัดการนักศึกษาฝึกงาน/สหกิจ (ไม่ใช้ LLM)",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(resume_matching.router, prefix="/api/v1")
app.include_router(chatbot.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}
