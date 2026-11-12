import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException

class InMemoryRateLimiter:
    """
    Lightweight, thread-safe in-memory sliding window rate limiter.
    """
    def __init__(self, max_requests: int, window_seconds: int, error_message: str):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.error_message = error_message
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def reset(self):
        self.requests.clear()

    def check(self, request: Request):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        window_start = now - self.window_seconds

        # Clean old timestamps
        timestamps = [t for t in self.requests[client_ip] if t > window_start]
        self.requests[client_ip] = timestamps

        if len(timestamps) >= self.max_requests:
            retry_after = max(1, int(self.window_seconds - (now - timestamps[0])))
            raise HTTPException(
                status_code=429,
                detail=f"{self.error_message} Please wait {retry_after} seconds before trying again."
            )

        self.requests[client_ip].append(now)

# Limits:
# Login: 10 attempts per minute per IP
login_limiter = InMemoryRateLimiter(
    max_requests=10,
    window_seconds=60,
    error_message="Too many authentication attempts."
)

# Review Submissions: 30 submissions per minute per IP
submit_limiter = InMemoryRateLimiter(
    max_requests=30,
    window_seconds=60,
    error_message="Submission rate limit reached."
)
