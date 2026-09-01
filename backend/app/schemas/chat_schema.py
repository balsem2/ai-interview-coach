from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=5000)


class ChatRequest(BaseModel):
    interview_session_id: int | None = None
    question_id: int | None = None
    answer: str = Field(min_length=1, max_length=10000)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    score: int | None = None
    interview_session_id: int | None = None


class FinalReportResponse(BaseModel):
    interview_session_id: int | None = None
    field: str | None = None
    difficulty: str | None = None
    status: str | None = None
    created_at: str | None = None
    duration_minutes: int | None = None
    summary: str
    average_score: float | None = None
    total_answers: int
    eye_contact: float | None = None
    confidence: float | None = None
    engagement: float | None = None
    answers: list[dict] = Field(default_factory=list)


class StartInterviewRequest(BaseModel):
    field: str | None = Field(default=None, max_length=150)
    difficulty: Literal["beginner", "intermediate", "advanced"] | None = None
    duration_minutes: Literal[15, 30, 45, 60] | None = None

    @field_validator("field")
    @classmethod
    def normalize_field(cls, value):
        return value.strip() if value else None


class StartInterviewResponse(BaseModel):
    interview_session_id: int


class CompleteInterviewRequest(BaseModel):
    eye_contact: float | None = Field(default=None, ge=0, le=100)
    confidence: float | None = Field(default=None, ge=0, le=100)
    engagement: float | None = Field(default=None, ge=0, le=100)


class CompleteInterviewResponse(BaseModel):
    interview_session_id: int
    status: str


class SkipQuestionRequest(BaseModel):
    question_id: int


class SessionListItem(BaseModel):
    session_id: int
    field: str | None = None
    difficulty: str | None = None
    status: str
    created_at: str | None = None
    completed_at: str | None = None
    duration_minutes: int | None = None
    average_score: float | None = None
    total_answers: int
