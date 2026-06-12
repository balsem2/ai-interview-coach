import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.question import Question

DATASET_PATH = r"C:\Users\balse\Downloads\archive\Mock_interview_questions.json"

db = SessionLocal()

try:
    existing_count = db.query(Question).count()

    if existing_count:
        print(f"Import ignoré: {existing_count} questions existent déjà.")
        sys.exit()

    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        data = json.load(file)

    questions = data["questions"]

    for item in questions:
        question = Question(
            field=item.get("field"),
            subfield=item.get("subfield"),
            subject=item.get("subject"),
            difficulty=item.get("tier"),
            question_text=item.get("question"),
            expected_answer=item.get("answer"),
            source=item.get("source"),
        )

        db.add(question)

    db.commit()

    print(f"{len(questions)} questions importées avec succès.")
finally:
    db.close()
