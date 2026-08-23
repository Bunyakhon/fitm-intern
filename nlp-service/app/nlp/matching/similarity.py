"""
คำนวณ cosine similarity ระหว่าง resume กับ job description แล้วจัดอันดับ
"""
from sklearn.metrics.pairwise import cosine_similarity

from app.nlp.matching.feature_extraction import build_vectorizer


def rank_jobs(resume_text: str, job_texts: list[str]) -> list[float]:
    """
    คืนค่า list ของ similarity score (0-1) เรียงตามลำดับเดียวกับ job_texts ที่ส่งเข้ามา
    ใช้ TF-IDF fit บน (resume + jobs ทั้งหมด) ในการเรียกครั้งเดียว เพื่อให้ vocabulary ตรงกัน
    """
    if not job_texts:
        return []

    vectorizer = build_vectorizer()
    corpus = [resume_text] + job_texts
    tfidf_matrix = vectorizer.fit_transform(corpus)

    resume_vec = tfidf_matrix[0:1]
    job_vecs = tfidf_matrix[1:]

    scores = cosine_similarity(resume_vec, job_vecs)[0]
    return scores.tolist()
