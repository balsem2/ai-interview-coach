from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import SessionLocal
from app.metrics import PrometheusMiddleware, metrics_response
from app.security import RateLimitMiddleware
from app.routes.auth import router as auth_router
from app.routes.analytics import router as analytics_router
from app.routes.chat import router as chat_router
from app.routes.questions import router as questions_router


app = FastAPI()
app.add_middleware(PrometheusMiddleware)
app.add_middleware(RateLimitMiddleware)

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

app.include_router(auth_router)
app.include_router(analytics_router)
app.include_router(questions_router)
app.include_router(chat_router)


@app.get("/")
def home():
    return {"message": "AI Interview Coach Backend Running"}


@app.get("/metrics", include_in_schema=False)
def metrics():
    return metrics_response()


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
