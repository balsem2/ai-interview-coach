from fastapi import APIRouter, Depends
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
    field: str | None = None,
    difficulty: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Question)

    if field:
        query = query.filter(Question.field == field)

    if difficulty:
        query = query.filter(Question.difficulty == difficulty)

    question = query.order_by(func.random()).first()

    return question


@router.get("/by-field/{field}")
def get_questions_by_field(field: str, db: Session = Depends(get_db)):
    questions = db.query(Question).filter(Question.field == field).limit(10).all()

    return questions


@router.get("/fields")
def get_question_fields(db: Session = Depends(get_db)):
    rows = db.query(Question.field).distinct().order_by(Question.field).all()

    return [row[0] for row in rows if row[0]]
