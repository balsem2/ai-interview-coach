import time
from collections import defaultdict, deque
from threading import Lock

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Small per-process limiter for the single-replica backend deployment."""

    limits = {
        ("POST", "/auth/login"): (10, 60),
        ("POST", "/auth/register"): (5, 60),
        ("POST", "/auth/refresh"): (20, 60),
        ("POST", "/chat/message"): (30, 60),
    }

    def __init__(self, app):
        super().__init__(app)
        self.requests = defaultdict(deque)
        self.lock = Lock()

    async def dispatch(self, request, call_next):
        limit = self.limits.get((request.method, request.url.path))
        if not limit:
            return await call_next(request)

        maximum, window_seconds = limit
        forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        client_ip = forwarded_for or (request.client.host if request.client else "unknown")
        key = (client_ip, request.method, request.url.path)
        now = time.monotonic()

        with self.lock:
            timestamps = self.requests[key]
            while timestamps and timestamps[0] <= now - window_seconds:
                timestamps.popleft()
            if len(timestamps) >= maximum:
                retry_after = max(1, int(window_seconds - (now - timestamps[0])))
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."},
                    headers={"Retry-After": str(retry_after)},
                )
            timestamps.append(now)

        return await call_next(request)
