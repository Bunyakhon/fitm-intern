from app.core.config import settings
from app.nlp.chatbot.intent_classifier import intent_classifier
from app.nlp.chatbot.response_selector import select_response
from app.schemas.chatbot import ChatResponse


def get_chat_reply(message: str) -> ChatResponse:
    intent, confidence, raw_response = intent_classifier.predict(message)
    reply = select_response(
        intent=intent,
        confidence=confidence,
        response=raw_response,
        min_confidence=settings.CHATBOT_MIN_CONFIDENCE,
    )
    return ChatResponse(reply=reply, intent=intent, confidence=round(confidence, 4))
