from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.interview_answer import InterviewAnswer
from app.models.interview_session import InterviewSession
from app.models.question import Question
from app.routes.auth import router as auth_router
from app.routes.chat import router as chat_router
from app.routes.questions import router as questions_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_origin_regex=r"http://(127\.0\.0\.1|localhost):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

with engine.begin() as connection:
    connection.exec_driver_sql(
        "ALTER TABLE interview_answers "
        "ADD COLUMN IF NOT EXISTS interview_session_id INTEGER "
        "REFERENCES interview_sessions(id)"
    )

app.include_router(auth_router)
app.include_router(questions_router)
app.include_router(chat_router)


@app.get("/")
def home():
    return {"message": "AI Interview Coach Backend Running"}
