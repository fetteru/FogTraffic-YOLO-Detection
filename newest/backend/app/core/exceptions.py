"""Global exception handlers."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from jose import JWTError

from app.core.logger import get_logger


logger = get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Register unified JSON exception handlers."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        log = logger.warning if 400 <= exc.status_code < 500 else logger.error
        log("HTTP %d: %s | path=%s", exc.status_code, exc.detail, request.url.path)
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.status_code, "message": exc.detail, "data": None},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
            errors.append(f"{field}: {error['msg']}")

        logger.warning("Validation failed | path=%s | errors=%s", request.url.path, errors)
        return JSONResponse(
            status_code=422,
            content={"code": 422, "message": "参数验证失败", "data": errors},
        )

    @app.exception_handler(JWTError)
    async def jwt_exception_handler(request: Request, exc: JWTError):
        logger.warning("JWT validation failed | path=%s | error=%s", request.url.path, exc)
        return JSONResponse(
            status_code=401,
            content={"code": 401, "message": "无效的认证凭据", "data": None},
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception | path=%s | method=%s | error=%s",
            request.url.path,
            request.method,
            exc,
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={"code": 500, "message": "服务器内部错误", "data": None},
        )
