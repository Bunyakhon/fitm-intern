from app.nlp.matching.similarity import rank_jobs
from app.schemas.job_matching import JobMatchRequest, JobMatchResult


def _rank_or_zero(candidate_text: str, job_texts: list[str]) -> list[float]:
    try:
        return rank_jobs(candidate_text, job_texts)
    except ValueError as error:
        # TfidfVectorizer raises this when preprocessing removes every token.
        if "empty vocabulary" not in str(error).lower():
            raise
        return [0.0] * len(job_texts)


def match_jobs(request: JobMatchRequest) -> list[JobMatchResult]:
    if not request.jobs:
        return []

    job_texts = [job.text for job in request.jobs]
    profile_scores = _rank_or_zero(request.candidate.text, job_texts)
    if request.candidate.resume_text is None:
        scores = profile_scores
    else:
        resume_scores = _rank_or_zero(request.candidate.resume_text, job_texts)
        scores = [0.65 * profile + 0.35 * resume for profile, resume in zip(profile_scores, resume_scores)]

    matches = [
        (str(job.job_posting_id), round(float(score), 4))
        for job, score in zip(request.jobs, scores)
        if score >= request.options.min_score
    ]
    matches.sort(key=lambda match: (-match[1], match[0]))

    return [
        JobMatchResult(job_posting_id=job_posting_id, score=score, rank=index)
        for index, (job_posting_id, score) in enumerate(matches, start=1)
    ][: request.options.top_k]
