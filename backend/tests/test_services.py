import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes.analytics import rounded_average
from app.metrics import metrics_response
from app.security import RateLimitMiddleware
from app.services.ai_service import build_local_final_report, estimate_score


class FakeQuestion:
    question_text = "Explain dependency injection and why it is useful."
    expected_answer = "Dependency injection separates dependencies, improves testing, and reduces coupling."
    difficulty = "intermediate"
    field = "Computer Science"


class ScoringTests(unittest.TestCase):
    def test_weak_answer_scores_zero(self):
        self.assertEqual(estimate_score(FakeQuestion(), "idk"), 0)

    def test_structured_relevant_answer_scores_above_short_answer(self):
        answer = (
            "Dependency injection separates the creation of dependencies from their use. "
            "In a service, I inject a repository through the constructor, which reduces coupling, "
            "improves testing with mocks, and keeps the implementation easier to maintain."
        )
        self.assertGreaterEqual(estimate_score(FakeQuestion(), answer), 55)


class ReportFallbackTests(unittest.TestCase):
    def test_local_report_contains_average_and_recommendations(self):
        report = build_local_final_report([
            {"score": 80},
            {"score": 60},
        ])
        self.assertIn("70.0/100", report)
        self.assertIn("Recommendations", report)


class AnalyticsTests(unittest.TestCase):
    def test_rounded_average_ignores_missing_values(self):
        self.assertEqual(rounded_average([80, None, 60]), 70.0)
        self.assertEqual(rounded_average([]), 0.0)

    def test_metrics_endpoint_uses_prometheus_format(self):
        response = metrics_response()
        self.assertIn(b"ai_interview_http_requests_total", response.body)


class SecurityTests(unittest.TestCase):
    def test_login_rate_limit_returns_429(self):
        app = FastAPI()
        app.add_middleware(RateLimitMiddleware)

        @app.post("/auth/login")
        def fake_login():
            return {"ok": True}

        with TestClient(app) as client:
            responses = [client.post("/auth/login") for _ in range(11)]

        self.assertTrue(all(response.status_code == 200 for response in responses[:10]))
        self.assertEqual(responses[-1].status_code, 429)
        self.assertIn("Retry-After", responses[-1].headers)


if __name__ == "__main__":
    unittest.main()
