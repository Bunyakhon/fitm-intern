from fastapi import APIRouter

from app.schemas.resume_matching import ResumeMatchRequest, ResumeMatchResponse
from app.services.matching_service import match_resume

router = APIRouter(prefix="/resume-match", tags=["resume-matching"])


@router.post("", response_model=ResumeMatchResponse)
def post_resume_match(request: ResumeMatchRequest) -> ResumeMatchResponse:
    """
    รับ resume text + รายการตำแหน่งงาน คืนค่ารายชื่อบริษัทที่เหมาะสมที่สุด เรียงจากคะแนนสูงไปต่ำ
    """
    matches = match_resume(request)
    return ResumeMatchResponse(matches=matches)
