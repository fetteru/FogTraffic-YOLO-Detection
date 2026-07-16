"""Request logging middleware."""

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.logger import get_logger


logger = get_logger("request")

SKIP_PATHS = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
    "/api/health",
)


class RequestLogMiddleware(BaseHTTPMiddleware):
    """Log request method, path, client IP, status, and duration."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(skip) for skip in SKIP_PATHS):
            return await call_next(request)

        method = request.method
        client_ip = request.client.host if request.client else "unknown"
        content_length = request.headers.get("content-length", "0")
        logger.info("-> %s %s | ip=%s | size=%s", method, path, client_ip, content_length)

        start_time = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        status_code = response.status_code

        if status_code >= 500:
            log = logger.error
        elif status_code >= 400:
            log = logger.warning
        else:
            log = logger.info
        log("<- %s %s | status=%d | %.1fms", method, path, status_code, duration_ms)

        return response
