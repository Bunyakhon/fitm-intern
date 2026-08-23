from pydantic import BaseModel, Field


class JobPosting(BaseModel):
    """ตำแหน่งงาน/บริษัทที่รับนักศึกษาฝึกงาน"""
    id: str
    company_name: str
    position: str
    description: str = Field(..., description="รายละเอียดงาน/คุณสมบัติที่ต้องการ")


class ResumeMatchRequest(BaseModel):
    resume_text: str = Field(
        ..., description="เนื้อหา resume หรือทักษะของนักศึกษา (plain text)"
    )
    job_postings: list[JobPosting] = Field(
        default_factory=list,
        description="รายการตำแหน่งงานที่จะเทียบกับ resume นี้ ถ้าไม่ส่งมาจะใช้ข้อมูลจาก data/processed",
    )
    top_k: int | None = Field(default=None, description="จำนวนอันดับสูงสุดที่ต้องการ")


class MatchResult(BaseModel):
    job_id: str
    company_name: str
    position: str
    score: float = Field(..., description="คะแนนความเหมือน 0-1 (cosine similarity)")


class ResumeMatchResponse(BaseModel):
    matches: list[MatchResult]
