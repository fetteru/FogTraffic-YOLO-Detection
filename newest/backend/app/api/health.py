"""Health check API routes."""

from fastapi import APIRouter

from app.config.settings import settings
from app.core.logger import get_logger


logger = get_logger(__name__)
router = APIRouter(tags=["健康检查"])


@router.get("/api/health")
async def health_check():
    """Basic liveness check that does not depend on external services."""
    return {
        "code": 200,
        "message": "ok",
        "data": {
            "status": "healthy",
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
        },
    }


@router.get("/api/health/detail")
async def health_check_detail():
    """Detailed readiness check for PostgreSQL, Redis, and MinIO."""
    services = {}

    try:
        from sqlalchemy import text

        from app.database.session import SessionLocal

        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
        services["database"] = {"status": "healthy", "message": "PostgreSQL 连接正常"}
    except Exception as exc:
        services["database"] = {
            "status": "unhealthy",
            "message": f"PostgreSQL 连接失败: {exc}",
        }
        logger.error("PostgreSQL health check failed: %s", exc)

    try:
        import redis

        redis_client = redis.from_url(settings.REDIS_URL)
        redis_client.ping()
        redis_client.close()
        services["redis"] = {"status": "healthy", "message": "Redis 连接正常"}
    except Exception as exc:
        services["redis"] = {"status": "unhealthy", "message": f"Redis 连接失败: {exc}"}
        logger.error("Redis health check failed: %s", exc)

    try:
        from app.storage.minio_client import MinIOClient

        minio = MinIOClient()
        minio.client.list_buckets()
        services["minio"] = {"status": "healthy", "message": "MinIO 连接正常"}
    except Exception as exc:
        services["minio"] = {"status": "unhealthy", "message": f"MinIO 连接失败: {exc}"}
        logger.error("MinIO health check failed: %s", exc)

    all_healthy = all(service["status"] == "healthy" for service in services.values())
    return {
        "code": 200,
        "message": "ok",
        "data": {
            "status": "healthy" if all_healthy else "degraded",
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "services": services,
        },
    }
