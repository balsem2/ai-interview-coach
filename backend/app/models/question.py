from sqlalchemy import Column, Integer, String, Text

from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    field = Column(String(150))
    subfield = Column(String(150))
    subject = Column(String(150))
    difficulty = Column(String(50))
    question_text = Column(Text)
    expected_answer = Column(Text)
    source = Column(Text)
