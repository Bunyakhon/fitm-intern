"""
Intent classifier แบบ classic ML (ไม่ใช่ LLM)
เทรนจากไฟล์ data/processed/chatbot/faq_seed.json ตอน startup ของ service
โมเดล: TF-IDF + Logistic Regression — เบาพอเทรนใหม่ได้ทุกครั้งที่ deploy โดยไม่ต้องรอนาน
"""
import json
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from app.core.config import settings
from app.nlp.matching.feature_extraction import build_vectorizer


class IntentClassifier:
    def __init__(self, faq_path: Path):
        self._faq_path = faq_path
        self._pipeline: Pipeline | None = None
        self._responses: dict[str, str] = {}

    def load_and_train(self) -> None:
        with open(self._faq_path, encoding="utf-8") as f:
            faq_data = json.load(f)

        texts: list[str] = []
        labels: list[str] = []
        for item in faq_data:
            intent = item["intent"]
            self._responses[intent] = item["response"]
            for example in item["examples"]:
                texts.append(example)
                labels.append(intent)

        self._pipeline = Pipeline(
            steps=[
                ("tfidf", build_vectorizer()),
                ("clf", LogisticRegression(max_iter=1000)),
            ]
        )
        self._pipeline.fit(texts, labels)

    def predict(self, message: str) -> tuple[str, float, str]:
        """คืนค่า (intent, confidence, response_text)"""
        if self._pipeline is None:
            raise RuntimeError("IntentClassifier ยังไม่ได้ train — เรียก load_and_train() ก่อน")

        proba = self._pipeline.predict_proba([message])[0]
        classes = self._pipeline.classes_
        best_idx = proba.argmax()
        intent = classes[best_idx]
        confidence = float(proba[best_idx])
        response = self._responses.get(intent, "")
        return intent, confidence, response


# instance เดียวใช้ร่วมกันทั้ง service (train ตอน startup ผ่าน main.py lifespan)
intent_classifier = IntentClassifier(faq_path=settings.CHATBOT_FAQ_FILE)
