from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, SessionLocal, engine
from app.models.interview_answer import InterviewAnswer
from app.models.interview_session import InterviewSession
from app.models.question import Question
from app.routes.auth import router as auth_router
from app.routes.chat import router as chat_router
from app.routes.questions import router as questions_router


# Importing these classes registers their SQLAlchemy tables before create_all.
SQLALCHEMY_MODELS = (InterviewAnswer, InterviewSession, Question)

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


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "backend"
    }


@app.get("/health/live")
def health_live():
    return {
        "status": "alive",
        "service": "backend"
    }


@app.get("/health/ready")
def health_ready():
    db = SessionLocal()

    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "service": "backend",
            "database": "ok"
        }
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "service": "backend",
                "database": "error"
            },
        ) from exc
    finally:
        db.close()
