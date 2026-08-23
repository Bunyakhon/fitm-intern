from app.core.config import settings
from app.nlp.matching.similarity import rank_jobs
from app.schemas.resume_matching import JobPosting, MatchResult, ResumeMatchRequest


def match_resume(request: ResumeMatchRequest) -> list[MatchResult]:
    """
    รับ resume + รายการตำแหน่งงาน คืนค่ารายการที่ match เรียงจากคะแนนสูงสุด
    กรองอันที่คะแนนต่ำกว่า MATCHING_MIN_SCORE ทิ้ง
    """
    postings: list[JobPosting] = request.job_postings
    if not postings:
        return []

    job_texts = [f"{p.position} {p.description}" for p in postings]
    scores = rank_jobs(request.resume_text, job_texts)

    results = [
        MatchResult(
            job_id=posting.id,
            company_name=posting.company_name,
            position=posting.position,
            score=round(score, 4),
        )
        for posting, score in zip(postings, scores)
        if score >= settings.MATCHING_MIN_SCORE
    ]

    results.sort(key=lambda r: r.score, reverse=True)

    top_k = request.top_k or settings.MATCHING_TOP_K
    return results[:top_k]
