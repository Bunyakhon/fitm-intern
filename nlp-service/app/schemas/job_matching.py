from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Candidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(..., max_length=20_000)
    resume_text: str | None = Field(default=None, max_length=20_000)

    @field_validator("text")
    @classmethod
    def text_must_not_be_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be empty")
        return value

    @field_validator("resume_text")
    @classmethod
    def resume_text_must_not_be_empty(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("must not be empty when provided")
        return value


class JobForMatching(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_posting_id: UUID
    text: str = Field(..., max_length=21_000)

    @field_validator("text")
    @classmethod
    def text_must_not_be_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be empty")
        return value


class MatchingOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    top_k: int = Field(..., ge=1, le=100)
    min_score: float = Field(..., ge=0, le=1, allow_inf_nan=False)


class JobMatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(..., pattern=r"^job-matching\.v1$")
    candidate: Candidate
    jobs: list[JobForMatching]
    options: MatchingOptions

    @model_validator(mode="after")
    def job_ids_must_be_unique(self) -> "JobMatchRequest":
        ids = [job.job_posting_id for job in self.jobs]
        if len(ids) != len(set(ids)):
            raise ValueError("jobs must not contain duplicate job_posting_id values")
        return self


class JobMatchResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_posting_id: str
    score: float = Field(..., ge=0, le=1, allow_inf_nan=False)
    rank: int = Field(..., ge=1)


class JobMatchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = "job-matching.v1"
    matches: list[JobMatchResult]
