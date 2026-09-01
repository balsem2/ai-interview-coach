from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.interview_answer import InterviewAnswer
from app.models.interview_session import InterviewSession
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.analytics_schema import AnalyticsSummary

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def rounded_average(values):
    cleaned = [float(value) for value in values if value is not None]
    return round(sum(cleaned) / len(cleaned), 1) if cleaned else 0.0


@router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )

    score_rows = (
        db.query(
            InterviewAnswer.interview_session_id,
            func.avg(InterviewAnswer.score).label("average_score"),
        )
        .filter(InterviewAnswer.user_id == current_user.id)
        .group_by(InterviewAnswer.interview_session_id)
        .all()
    )
    scores_by_session = {
        row.interview_session_id: round(float(row.average_score), 1)
        for row in score_rows
        if row.average_score is not None
    }

    completed_sessions = [session for session in sessions if session.status == "completed"]
    durations = []
    for session in completed_sessions:
        if session.completed_at and session.created_at:
            completed_at = session.completed_at
            created_at = session.created_at
            if (completed_at.tzinfo is None) != (created_at.tzinfo is None):
                completed_at = completed_at.replace(tzinfo=None)
                created_at = created_at.replace(tzinfo=None)
            durations.append((completed_at - created_at).total_seconds() / 60)
        elif session.duration_minutes:
            durations.append(session.duration_minutes)

    recent_interviews = [
        {
            "session_id": session.id,
            "field": session.field,
            "difficulty": session.difficulty,
            "status": session.status or "in_progress",
            "date": session.created_at.date().isoformat() if session.created_at else "",
            "duration_minutes": session.duration_minutes,
            "average_score": scores_by_session.get(session.id),
        }
        for session in sessions[:5]
    ]

    trend_sessions = [session for session in reversed(sessions) if session.id in scores_by_session][-7:]
    performance_trend = [
        {
            "label": session.created_at.strftime("%d/%m") if session.created_at else str(session.id),
            "score": scores_by_session[session.id],
        }
        for session in trend_sessions
    ]

    all_session_scores = list(scores_by_session.values())
    return {
        "overall_performance": rounded_average(all_session_scores),
        "total_interviews": len(sessions),
        "average_duration_minutes": rounded_average(durations),
        "eye_contact": rounded_average(session.avg_eye_contact for session in completed_sessions),
        "confidence": rounded_average(session.avg_confidence for session in completed_sessions),
        "engagement": rounded_average(session.avg_engagement for session in completed_sessions),
        "response_quality": rounded_average(all_session_scores),
        "recent_interviews": recent_interviews,
        "performance_trend": performance_trend,
    }
