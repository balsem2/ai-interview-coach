import time

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

HTTP_REQUESTS = Counter("ai_interview_http_requests_total", "Total backend HTTP requests.", ["method", "path", "status"])
HTTP_DURATION = Histogram("ai_interview_http_request_duration_seconds", "Backend request duration.", ["method", "path"])
AI_GENERATION_DURATION = Histogram("ai_interview_ai_generation_duration_seconds", "AI generation duration.", ["provider"])
AI_GENERATION_ERRORS = Counter("ai_interview_ai_generation_errors_total", "Failed AI generations.", ["provider"])


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.url.path == "/metrics":
            return await call_next(request)
        started_at = time.perf_counter()
        response = await call_next(request)
        route = request.scope.get("route")
        path = getattr(route, "path", request.url.path)
        HTTP_REQUESTS.labels(request.method, path, response.status_code).inc()
        HTTP_DURATION.labels(request.method, path).observe(time.perf_counter() - started_at)
        return response


def metrics_response():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
