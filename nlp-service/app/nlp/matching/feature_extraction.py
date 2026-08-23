"""
แปลง resume/job description เป็น vector ด้วย TF-IDF (classic NLP ไม่ใช่ LLM)
"""
from sklearn.feature_extraction.text import TfidfVectorizer

from app.nlp.common.preprocessing import tokenize_to_string


def build_vectorizer() -> TfidfVectorizer:
    """
    สร้าง TfidfVectorizer ตัวใหม่
    หมายเหตุ: preprocessor ตัดคำเองแล้ว (tokenize_to_string) จึงปิด tokenizer/lowercase ของ sklearn
    """
    return TfidfVectorizer(
        preprocessor=tokenize_to_string,
        tokenizer=str.split,
        lowercase=False,
        token_pattern=None,
    )
