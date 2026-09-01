from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    field = Column(String(150))
    difficulty = Column(String(50))
    duration_minutes = Column(Integer)
    status = Column(String(30), default="in_progress")
    avg_eye_contact = Column(Float)
    avg_confidence = Column(Float)
    avg_engagement = Column(Float)
    report_summary = Column(Text)
    report_generated_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
