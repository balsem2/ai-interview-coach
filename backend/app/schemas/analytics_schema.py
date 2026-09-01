from pydantic import BaseModel


class RecentInterview(BaseModel):
    session_id: int
    field: str | None = None
    difficulty: str | None = None
    status: str
    date: str
    duration_minutes: int | None = None
    average_score: float | None = None


class PerformancePoint(BaseModel):
    label: str
    score: float


class AnalyticsSummary(BaseModel):
    overall_performance: float
    total_interviews: int
    average_duration_minutes: float
    eye_contact: float
    confidence: float
    engagement: float
    response_quality: float
    recent_interviews: list[RecentInterview]
    performance_trend: list[PerformancePoint]
