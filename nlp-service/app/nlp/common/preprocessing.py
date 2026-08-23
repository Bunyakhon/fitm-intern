"""
Preprocessing ข้อความภาษาไทย/อังกฤษ ใช้ร่วมกันทั้ง resume-matching และ chatbot
ไม่ใช้ LLM — ใช้ pythainlp (dictionary-based, offline) สำหรับตัดคำไทย
"""
import re

try:
    from pythainlp.tokenize import word_tokenize
    from pythainlp.corpus import thai_stopwords

    _STOPWORDS = thai_stopwords()
    _HAS_PYTHAINLP = True
except ImportError:  # กันไว้เผื่อยังไม่ได้ pip install ตอน dev
    _HAS_PYTHAINLP = False
    _STOPWORDS = set()

_ENGLISH_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "is", "are", "for", "with",
}

_CLEAN_PATTERN = re.compile(r"[^\u0E00-\u0E7Fa-zA-Z0-9\s]")


def clean_text(text: str) -> str:
    """ลบอักขระพิเศษ, ลด whitespace ซ้ำ"""
    text = text.strip().lower()
    text = _CLEAN_PATTERN.sub(" ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def tokenize(text: str) -> list[str]:
    """
    ตัดคำไทย+อังกฤษ แล้วกรอง stopword ทิ้ง
    คืนค่าเป็น list ของคำ พร้อมใช้ต่อกับ TF-IDF vectorizer
    """
    cleaned = clean_text(text)
    if not cleaned:
        return []

    if _HAS_PYTHAINLP:
        tokens = word_tokenize(cleaned, engine="newmm")
    else:
        tokens = cleaned.split()

    tokens = [
        t.strip()
        for t in tokens
        if t.strip() and t not in _STOPWORDS and t not in _ENGLISH_STOPWORDS
    ]
    return tokens


def tokenize_to_string(text: str) -> str:
    """สำหรับ TfidfVectorizer ที่ต้องการ input เป็น string ที่ตัดคำแล้ว (เว้นวรรคคั่นคำ)"""
    return " ".join(tokenize(text))
