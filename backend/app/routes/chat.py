from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.interview_answer import InterviewAnswer
from app.models.interview_session import InterviewSession
from app.models.question import Question
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.chat_schema import (
    ChatRequest,
    ChatResponse,
    CompleteInterviewRequest,
    CompleteInterviewResponse,
    FinalReportResponse,
    SessionListItem,
    SkipQuestionRequest,
    StartInterviewRequest,
    StartInterviewResponse,
)
from app.services.ai_service import (
    build_local_interview_feedback,
    build_local_final_report,
    build_short_answer_feedback,
    estimate_score,
    generate_final_report,
    generate_interview_reply,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_session(payload: ChatRequest, current_user: User, db: Session):
    if payload.interview_session_id:
        session = (
            db.query(InterviewSession)
            .filter(
                InterviewSession.id == payload.interview_session_id,
                InterviewSession.user_id == current_user.id
            )
            .first()
        )

        if session and session.status == "completed":
            raise HTTPException(status_code=409, detail="Interview session is already completed")
        if session:
            return session
        raise HTTPException(status_code=404, detail="Interview session not found")

    session = InterviewSession(user_id=current_user.id)
    db.add(session)
    db.commit()
    db.refresh(session)

    return session


@router.post("/session/start", response_model=StartInterviewResponse)
def start_interview_session(
    payload: StartInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = InterviewSession(
        user_id=current_user.id,
        field=payload.field,
        difficulty=payload.difficulty,
        duration_minutes=payload.duration_minutes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {"interview_session_id": session.id}


@router.post(
    "/session/{session_id}/complete",
    response_model=CompleteInterviewResponse,
)
def complete_interview_session(
    session_id: int,
    payload: CompleteInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session.status == "completed":
        return {"interview_session_id": session.id, "status": session.status}

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    session.avg_eye_contact = payload.eye_contact
    session.avg_confidence = payload.confidence
    session.avg_engagement = payload.engagement
    db.commit()

    return {"interview_session_id": session.id, "status": session.status}


@router.post("/session/{session_id}/skip", response_model=ChatResponse)
def skip_interview_question(
    session_id: int,
    payload: SkipQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )
    question = db.query(Question).filter(Question.id == payload.question_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if session.status == "completed":
        raise HTTPException(status_code=409, detail="Interview session is already completed")

    existing_answer = (
        db.query(InterviewAnswer)
        .filter(
            InterviewAnswer.interview_session_id == session.id,
            InterviewAnswer.question_id == question.id,
        )
        .first()
    )
    if existing_answer:
        raise HTTPException(status_code=409, detail="Question was already answered in this session")

    feedback = "This question was skipped because the available time ended. Review it before the next interview."
    db.add(InterviewAnswer(
        interview_session_id=session.id,
        user_id=current_user.id,
        question_id=question.id,
        answer_text="[Skipped]",
        ai_feedback=feedback,
        score=0,
        status="skipped",
    ))
    db.commit()

    return {"reply": feedback, "score": 0, "interview_session_id": session.id}


@router.get("/sessions", response_model=list[SessionListItem])
def list_interview_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            InterviewSession,
            func.avg(InterviewAnswer.score).label("average_score"),
            func.count(InterviewAnswer.id).label("total_answers"),
        )
        .outerjoin(InterviewAnswer, InterviewAnswer.interview_session_id == InterviewSession.id)
        .filter(InterviewSession.user_id == current_user.id)
        .group_by(InterviewSession.id)
        .order_by(InterviewSession.created_at.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "session_id": session.id,
            "field": session.field,
            "difficulty": session.difficulty,
            "status": session.status or "in_progress",
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "duration_minutes": session.duration_minutes,
            "average_score": round(float(average_score), 1) if average_score is not None else None,
            "total_answers": total_answers,
        }
        for session, average_score, total_answers in rows
    ]


@router.post("/message", response_model=ChatResponse)
def chat_message(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    question = None

    if payload.question_id:
        question = db.query(Question).filter(Question.id == payload.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

    session = get_or_create_session(payload, current_user, db)

    if question:
        existing_answer = (
            db.query(InterviewAnswer)
            .filter(
                InterviewAnswer.interview_session_id == session.id,
                InterviewAnswer.question_id == question.id,
            )
            .first()
        )
        if existing_answer:
            raise HTTPException(status_code=409, detail="Question was already answered in this session")

    score = estimate_score(question, payload.answer)

    if score == 0 or len(payload.answer.split()) < 25:
        reply = build_short_answer_feedback(
            question=question,
            user_answer=payload.answer,
            score=score
        )
    else:
        try:
            reply = generate_interview_reply(
                question=question,
                user_answer=payload.answer,
                history=payload.history
            )
        except Exception:
            reply = build_local_interview_feedback(
                question=question,
                user_answer=payload.answer,
                score=score
            )
    if question:
        saved_answer = InterviewAnswer(
            interview_session_id=session.id,
            user_id=current_user.id,
            question_id=question.id,
            answer_text=payload.answer,
            ai_feedback=reply,
            score=score
        )
        db.add(saved_answer)
        db.commit()

    return {"reply": reply, "score": score, "interview_session_id": session.id}


def build_session_report(session: InterviewSession | None, db: Session):
    if not session:
        return {
            "interview_session_id": None,
            "summary": "No interview session found yet. Complete an interview to generate a report.",
            "average_score": None,
            "total_answers": 0,
            "answers": [],
        }

    answers = (
        db.query(InterviewAnswer, Question)
        .join(Question, InterviewAnswer.question_id == Question.id)
        .filter(InterviewAnswer.interview_session_id == session.id)
        .order_by(InterviewAnswer.created_at.asc())
        .all()
    )

    if not answers:
        return {
            "interview_session_id": session.id,
            "field": session.field,
            "difficulty": session.difficulty,
            "status": session.status,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "duration_minutes": session.duration_minutes,
            "summary": "No interview answers saved yet. Complete at least one interview answer to generate a report.",
            "average_score": None,
            "total_answers": 0,
            "eye_contact": session.avg_eye_contact,
            "confidence": session.avg_confidence,
            "engagement": session.avg_engagement,
            "answers": [],
        }

    report_items = [
        {
            "question": question.question_text,
            "answer": answer.answer_text,
            "score": answer.score,
            "feedback": answer.ai_feedback,
            "status": answer.status,
        }
        for answer, question in answers
    ]

    average_score = sum(item["score"] or 0 for item in report_items) / len(report_items)
    summary = session.report_summary
    if not summary:
        try:
            summary = generate_final_report(report_items)
        except Exception:
            summary = build_local_final_report(report_items)

        if session.status == "completed":
            session.report_summary = summary
            session.report_generated_at = datetime.now(timezone.utc)
            db.commit()

    return {
        "interview_session_id": session.id,
        "field": session.field,
        "difficulty": session.difficulty,
        "status": session.status,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "duration_minutes": session.duration_minutes,
        "summary": summary,
        "average_score": round(average_score, 1),
        "total_answers": len(report_items),
        "eye_contact": session.avg_eye_contact,
        "confidence": session.avg_confidence,
        "engagement": session.avg_engagement,
        "answers": report_items,
    }


@router.get("/session/{session_id}/report", response_model=FinalReportResponse)
def session_report(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    return build_session_report(session, db)


@router.get("/report", response_model=FinalReportResponse)
def final_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    latest_session = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .first()
    )

    return build_session_report(latest_session, db)
