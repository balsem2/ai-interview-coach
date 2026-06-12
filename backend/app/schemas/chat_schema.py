from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    interview_session_id: int | None = None
    question_id: int | None = None
    answer: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    score: int | None = None
    interview_session_id: int | None = None


class FinalReportResponse(BaseModel):
    summary: str
    average_score: float | None = None
    total_answers: int


class StartInterviewRequest(BaseModel):
    field: str | None = None
    difficulty: str | None = None


class StartInterviewResponse(BaseModel):
    interview_session_id: int
