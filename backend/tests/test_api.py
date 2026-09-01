import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.interview_answer import InterviewAnswer
from app.models.interview_session import InterviewSession
from app.models.question import Question
from app.models.user import User
from app.routes import analytics, auth, chat, questions


class ApiFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestSession = sessionmaker(bind=cls.engine, autocommit=False, autoflush=False)
        Base.metadata.create_all(bind=cls.engine)

        app = FastAPI()
        app.include_router(auth.router)
        app.include_router(questions.router)
        app.include_router(chat.router)
        app.include_router(analytics.router)

        def test_db():
            db = cls.TestSession()
            try:
                yield db
            finally:
                db.close()

        for dependency in (auth.get_db, questions.get_db, chat.get_db, analytics.get_db):
            app.dependency_overrides[dependency] = test_db

        cls.client = TestClient(app)

    def setUp(self):
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        response = self.client.post("/auth/register", json={
            "fullname": "Integration Tester",
            "email": "tester@example.com",
            "password": "StrongPassword123!",
        })
        self.assertEqual(response.status_code, 200)
        login = self.client.post("/auth/login", json={
            "email": "tester@example.com",
            "password": "StrongPassword123!",
        })
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.json()["refresh_token"])
        self.headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        self.refresh_token = login.json()["refresh_token"]

        db = self.TestSession()
        db.add(Question(
            field="Computer Science",
            difficulty="beginner",
            question_text="What is an API?",
            expected_answer="An API is an interface used by software systems to communicate.",
        ))
        db.commit()
        self.question_id = db.query(Question.id).scalar()
        db.close()

    def test_full_session_skip_complete_history_and_report(self):
        started = self.client.post("/chat/session/start", headers=self.headers, json={
            "field": "Computer Science",
            "difficulty": "beginner",
            "duration_minutes": 15,
        })
        self.assertEqual(started.status_code, 200)
        session_id = started.json()["interview_session_id"]

        skipped = self.client.post(
            f"/chat/session/{session_id}/skip",
            headers=self.headers,
            json={"question_id": self.question_id},
        )
        self.assertEqual(skipped.status_code, 200)
        self.assertEqual(skipped.json()["score"], 0)

        completed = self.client.post(
            f"/chat/session/{session_id}/complete",
            headers=self.headers,
            json={"eye_contact": 75, "confidence": 70, "engagement": 80},
        )
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.json()["status"], "completed")

        history = self.client.get("/chat/sessions", headers=self.headers)
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.json()[0]["total_answers"], 1)

        with patch("app.routes.chat.generate_final_report", side_effect=RuntimeError("offline")):
            report = self.client.get(f"/chat/session/{session_id}/report", headers=self.headers)
        self.assertEqual(report.status_code, 200)
        self.assertEqual(report.json()["answers"][0]["status"], "skipped")
        self.assertEqual(report.json()["eye_contact"], 75)

        with patch("app.routes.chat.generate_final_report") as report_generator:
            cached_report = self.client.get(f"/chat/session/{session_id}/report", headers=self.headers)
        self.assertEqual(cached_report.status_code, 200)
        self.assertEqual(cached_report.json()["summary"], report.json()["summary"])
        report_generator.assert_not_called()

        analytics_response = self.client.get("/analytics/summary", headers=self.headers)
        self.assertEqual(analytics_response.status_code, 200)
        self.assertEqual(analytics_response.json()["total_interviews"], 1)

        refreshed = self.client.post("/auth/refresh", json={"refresh_token": self.refresh_token})
        self.assertEqual(refreshed.status_code, 200)
        self.assertTrue(refreshed.json()["access_token"])

    def test_start_session_rejects_invalid_duration(self):
        response = self.client.post("/chat/session/start", headers=self.headers, json={
            "duration_minutes": 10,
        })
        self.assertEqual(response.status_code, 422)

    def test_rejects_duplicate_answer_and_unknown_session(self):
        started = self.client.post(
            "/chat/session/start",
            headers=self.headers,
            json={"duration_minutes": 15},
        )
        session_id = started.json()["interview_session_id"]
        payload = {
            "interview_session_id": session_id,
            "question_id": self.question_id,
            "answer": "An API lets separate software systems communicate through a defined interface.",
            "history": [],
        }

        first = self.client.post("/chat/message", headers=self.headers, json=payload)
        duplicate = self.client.post("/chat/message", headers=self.headers, json=payload)
        unknown = self.client.post(
            "/chat/message",
            headers=self.headers,
            json={**payload, "interview_session_id": 999999},
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(unknown.status_code, 404)

    def test_random_question_exclusions_and_filter_validation(self):
        excluded = self.client.get(
            "/questions/random",
            params=[("exclude_ids", self.question_id)],
        )
        invalid_difficulty = self.client.get(
            "/questions/random",
            params={"difficulty": "expert"},
        )

        self.assertEqual(excluded.status_code, 404)
        self.assertEqual(invalid_difficulty.status_code, 422)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.engine.dispose()


if __name__ == "__main__":
    unittest.main()
