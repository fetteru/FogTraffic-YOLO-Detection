from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用全局配置"""

    # ── 应用基础配置 ──────────────────────────────────
    APP_NAME: str = "RSOD Agent Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    LOG_DIR: str = "logs"
    LOG_MAX_BYTES: int = 10 * 1024 * 1024
    LOG_BACKUP_COUNT: int = 5

    # ── 数据库配置 ────────────────────────────────────
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "rsod_agent"
    DB_USER: str = "rsod_admin"
    DB_PASSWORD: str = "rsod_admin"

    @property
    def DATABASE_URL(self) -> str:
        """构造 PostgreSQL 连接字符串"""
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    # ── Redis 配置 ────────────────────────────────────
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    @property
    def REDIS_URL(self) -> str:
        """构造 Redis 连接字符串"""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # ── MinIO 配置 ────────────────────────────────────
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "rsod-agent-images"
    MINIO_SECURE: bool = False

    # Training
    TRAIN_OUTPUT_DIR: str = "runs/train"
    DATASET_BASE_DIR: str = "datasets"

    # Detection and Agent
    DEFAULT_MODEL_PATH: str = "models/rain_yolo_multiclass_v1_final/best.pt"
    DEFAULT_DATA_YAML: str = "datasets/rsod/raindataset/data.yaml"
    DETECTION_OUTPUT_DIR: str = "runs/detect"
    LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    QWEN_API_KEY: str = ""
    QWEN_MODEL: str = "qwen-plus"
    QWEN_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai/"

    # Agent memory and RAG
    AGENT_MEMORY_MAX_MESSAGES: int = 20
    AGENT_MEMORY_TTL_SECONDS: int = 60 * 60 * 24 * 7
    KNOWLEDGE_BASE_DIR: str = "backend/knowledge_base"
    RAG_TOP_K: int = 4

    # ── JWT 认证配置 ──────────────────────────────────
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_EMAIL: str = "admin@local.dev"
    DEFAULT_ADMIN_PASSWORD: str = "admin123456"

    # ── CORS 配置 ────────────────────────────────────
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,http://localhost:5173,http://localhost:8080"
    )

    @property
    def cors_origins_list(self) -> list:
        """将 CORS 配置字符串转为列表"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = str(Path(__file__).resolve().parents[2] / ".env")
        env_file_encoding = "utf-8"


# 创建全局单例，其他模块直接 import 使用
settings = Settings()
