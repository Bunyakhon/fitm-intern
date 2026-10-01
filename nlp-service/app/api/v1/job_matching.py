from fastapi import APIRouter

from app.schemas.job_matching import JobMatchRequest, JobMatchResponse
from app.services.job_matching_service import match_jobs

router = APIRouter(prefix="/job-matches", tags=["job-matching"])


@router.post("", response_model=JobMatchResponse)
def post_job_matches(request: JobMatchRequest) -> JobMatchResponse:
    return JobMatchResponse(matches=match_jobs(request))
