import json
import os
import sys
from pathlib import Path

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, SessionLocal, engine
from app.models.question import Question

DEFAULT_DATASET_PATH = Path(__file__).resolve().parents[2] / "database" / "Mock_interview_questions.json"
DATASET_PATH = Path(os.getenv("DATASET_PATH", str(DEFAULT_DATASET_PATH)))

if not DATASET_PATH.is_file():
    raise FileNotFoundError(f"Question dataset not found: {DATASET_PATH}")

db = SessionLocal()

try:
    Base.metadata.create_all(bind=engine)
    existing_count = db.query(Question).count()

    if existing_count:
        print(f"Import ignored: {existing_count} questions already exist.")
        sys.exit(0)

    with DATASET_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)

    questions = data.get("questions")
    if not isinstance(questions, list) or not questions:
        raise ValueError("The dataset must contain a non-empty 'questions' list.")

    db.bulk_save_objects([
        Question(
            field=item.get("field"),
            subfield=item.get("subfield"),
            subject=item.get("subject"),
            difficulty=item.get("tier"),
            question_text=item.get("question"),
            expected_answer=item.get("answer"),
            source=item.get("source"),
        )
        for item in questions
        if item.get("question")
    ])
    db.commit()
    print(f"{len(questions)} questions imported successfully.")
except Exception:
    db.rollback()
    raise
finally:
    db.close()
