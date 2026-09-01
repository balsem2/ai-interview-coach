from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func

from app.database import SessionLocal
from app.models.question import Question

router = APIRouter(prefix="/questions", tags=["Questions"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/random")
def get_random_question(
    field: str | None = Query(default=None, max_length=150),
    difficulty: Literal["beginner", "intermediate", "advanced"] | None = None,
    exclude_ids: list[int] | None = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(Question)

    if field:
        query = query.filter(Question.field == field)

    if difficulty:
        query = query.filter(Question.difficulty == difficulty)

    if exclude_ids:
        query = query.filter(Question.id.notin_(exclude_ids[:100]))

    question = query.order_by(func.random()).first()

    if not question:
        raise HTTPException(status_code=404, detail="No question matches the selected filters")

    return question


@router.get("/by-field/{field}")
def get_questions_by_field(
    field: str = Path(min_length=1, max_length=150),
    db: Session = Depends(get_db),
):
    questions = db.query(Question).filter(Question.field == field).limit(10).all()

    return questions


@router.get("/fields")
def get_question_fields(db: Session = Depends(get_db)):
    rows = db.query(Question.field).distinct().order_by(Question.field).all()

    return [row[0] for row in rows if row[0]]
