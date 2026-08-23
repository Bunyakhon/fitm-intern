from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., description="ข้อความจากผู้ใช้")


class ChatResponse(BaseModel):
    reply: str
    intent: str
    confidence: float = Field(..., description="ความมั่นใจของ intent classifier 0-1")
