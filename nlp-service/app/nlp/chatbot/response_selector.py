"""
เลือกคำตอบสุดท้าย — ถ้า confidence ต่ำกว่า threshold ให้ fallback แทนการเดา intent มั่ว ๆ
"""
FALLBACK_RESPONSE = (
    "ขออภัยค่ะ ยังไม่เข้าใจคำถามนี้ชัดเจน รบกวนลองถามใหม่ "
    "หรือติดต่อภาควิชาเทคโนโลยีสารสนเทศที่ it@itm.kmutnb.ac.th ค่ะ"
)


def select_response(intent: str, confidence: float, response: str, min_confidence: float) -> str:
    if confidence < min_confidence:
        return FALLBACK_RESPONSE
    return response
