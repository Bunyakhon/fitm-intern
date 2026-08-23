from fastapi import APIRouter

from app.schemas.chatbot import ChatRequest, ChatResponse
from app.services.chatbot_service import get_chat_reply

router = APIRouter(prefix="/chat", tags=["chatbot"])


@router.post("", response_model=ChatResponse)
def post_chat(request: ChatRequest) -> ChatResponse:
    """
    รับข้อความจากผู้ใช้ ตอบกลับเฉพาะเรื่องที่เกี่ยวกับเว็บไซต์ระบบฝึกงาน/สหกิจ
    (intent classification + retrieval — ไม่ใช้ LLM generate คำตอบ)
    """
    return get_chat_reply(request.message)
