from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.responses import JSONResponse

from app.api.v1 import chatbot, job_matching, resume_matching, resume_ocr, profile_pdf
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


@app.middleware("http")
async def bound_profile_pdf_upload(request, call_next):
    if request.url.path == "/api/v1/profile-pdf":
        # Bound multipart before Starlette spools a file; no chunked/unbounded uploads.
        length = request.headers.get("content-length", "")
        if not length.isdigit() or int(length) > 10 * 1024 * 1024 + 65536:
            return JSONResponse({"detail": "PDF_UPLOAD_LIMIT"}, status_code=413)
    return await call_next(request)

app.include_router(resume_matching.router, prefix="/api/v1")
app.include_router(resume_ocr.router, prefix="/api/v1")
app.include_router(profile_pdf.router, prefix="/api/v1")
app.include_router(job_matching.router, prefix="/api/v1")
app.include_router(chatbot.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}
