"""
pytest 全局 Fixtures

Fixtures 是 pytest 的核心概念，用于：
  - 创建测试所需的前置条件（如数据库连接、测试客户端）
  - 在所有测试用例间共享资源
  - 自动清理测试产生的数据

conftest.py 中的 fixtures 对所有测试文件可用，无需显式导入。
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import Base, get_db

# ── 测试数据库 ────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///./test.db"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


def override_get_db():
    """覆盖 FastAPI 的 get_db 依赖，使用测试数据库"""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── 导入所有模型（确保 Base.metadata 包含所有表定义）───
from app.entity import db_models  # noqa: E402, F401
from main import app  # noqa: E402

# 覆盖依赖
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    创建测试数据库表（所有测试共享）

    scope="session"：整个测试会话只执行一次
    autouse=True：自动应用，无需在测试函数中显式引用
    """
    Base.metadata.create_all(bind=test_engine)
    yield
    # 测试结束后清理
    Base.metadata.drop_all(bind=test_engine)
    import os
    if os.path.exists("./test.db"):
        os.remove("./test.db")


@pytest.fixture
def client():
    """
    提供 FastAPI 测试客户端

    用法：
        def test_health(client):
            response = client.get("/api/health")
            assert response.status_code == 200
    """
    return TestClient(app)


@pytest.fixture
def db_session():
    """
    提供独立的数据库会话（每个测试用独立事务）
    """
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
