from contextlib import asynccontextmanager
from pathlib import Path
import socket

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.dashboard import router as dashboard_router
from app.api.detection import router as detection_router
from app.api.history import router as history_router
from app.api.health import router as health_router
from app.api.knowledge import router as knowledge_router
from app.api.training import router as training_router
from app.api.user import router as user_router
from app.config.settings import settings
from app.core.exceptions import register_exception_handlers
from app.core.logger import get_logger, setup_logging
from app.middleware.request_logger import RequestLogMiddleware


setup_logging()
logger = get_logger(__name__)


def init_minio() -> None:
    """Initialize the MinIO bucket."""
    try:
        host, _, port = settings.MINIO_ENDPOINT.partition(":")
        if port:
            with socket.create_connection((host, int(port)), timeout=1):
                pass
        from app.storage.minio_client import MinIOClient

        minio_client = MinIOClient()
        logger.info("MinIO bucket '%s' initialized", minio_client.bucket_name)
    except Exception as exc:
        logger.warning("MinIO initialization skipped: %s", exc)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifecycle manager."""
    logger.info("Initializing services...")
    init_minio()
    yield
    logger.info("Service stopped")


app = FastAPI(
    title="RSOD Agent Platform",
    version=settings.APP_VERSION,
    description="基于 YOLOv11 的目标检测智能体平台 API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLogMiddleware)

static_root = Path.cwd() / settings.DETECTION_OUTPUT_DIR
static_root.mkdir(parents=True, exist_ok=True)
app.mount("/static/detections", StaticFiles(directory=str(static_root)), name="detections")

app.include_router(auth_router)
app.include_router(health_router)
app.include_router(training_router)
app.include_router(detection_router)
app.include_router(dashboard_router)
app.include_router(history_router)
app.include_router(user_router)
app.include_router(knowledge_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {
        "message": "欢迎使用 RSOD Agent Platform",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
