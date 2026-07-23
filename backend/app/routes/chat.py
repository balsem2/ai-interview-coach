from fastapi import APIRouter, Depends
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
    FinalReportResponse,
    StartInterviewRequest,
    StartInterviewResponse,
)
from app.services.ai_service import (
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

        if session:
            return session

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
        difficulty=payload.difficulty
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {"interview_session_id": session.id}


@router.post("/message", response_model=ChatResponse)
def chat_message(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    question = None

    if payload.question_id:
        question = db.query(Question).filter(Question.id == payload.question_id).first()

    score = estimate_score(question, payload.answer)

    if score == 0 or len(payload.answer.split()) < 25:
        reply = build_short_answer_feedback(
            question=question,
            user_answer=payload.answer,
            score=score
        )
    else:
        reply = generate_interview_reply(
            question=question,
            user_answer=payload.answer,
            history=payload.history
        )
    session = get_or_create_session(payload, current_user, db)

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


@router.get("/report", response_model=FinalReportResponse)
def final_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    answers = (
        db.query(InterviewAnswer, Question)
        .join(Question, InterviewAnswer.question_id == Question.id)
        .filter(InterviewAnswer.user_id == current_user.id)
        .order_by(InterviewAnswer.created_at.desc())
        .limit(5)
        .all()
    )

    if not answers:
        return {
            "summary": "No interview answers saved yet. Complete at least one interview answer to generate a report.",
            "average_score": None,
            "total_answers": 0
        }

    report_items = [
        {
            "question": question.question_text,
            "answer": answer.answer_text,
            "score": answer.score,
            "feedback": answer.ai_feedback
        }
        for answer, question in answers
    ]

    average_score = sum(item["score"] or 0 for item in report_items) / len(report_items)
    summary = generate_final_report(report_items)

    return {
        "summary": summary,
        "average_score": round(average_score, 1),
        "total_answers": len(report_items)
    }
