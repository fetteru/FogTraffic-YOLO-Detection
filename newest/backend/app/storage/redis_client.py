"""Redis client with in-memory fallback for temporary task progress."""

from __future__ import annotations

import json
import time
from typing import Any

import redis
from redis.exceptions import RedisError

from app.config.settings import settings
from app.core.logger import get_logger


logger = get_logger(__name__)


class RedisClient:
    """Small Redis wrapper used by video detection progress polling."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._connect()
        return cls._instance

    def _connect(self) -> None:
        self._memory_cache: dict[str, tuple[Any, float | None]] = {}
        self._client = None
        try:
            self._client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=0,
                decode_responses=True,
                socket_timeout=3,
                socket_connect_timeout=3,
            )
            self._client.ping()
            logger.info("Redis connected: %s:%s", settings.REDIS_HOST, settings.REDIS_PORT)
        except RedisError as exc:
            self._client = None
            logger.warning("Redis unavailable, using memory cache: %s", exc)

    def set_json(self, key: str, value: dict, expire: int | None = None) -> None:
        if self._client is not None:
            try:
                self._client.set(key, json.dumps(value, ensure_ascii=False), ex=expire)
                return
            except RedisError as exc:
                logger.warning("Redis set failed, using memory cache: %s", exc)
        expires_at = time.time() + expire if expire else None
        self._memory_cache[key] = (value, expires_at)

    def get_json(self, key: str) -> dict | None:
        if self._client is not None:
            try:
                raw = self._client.get(key)
                return json.loads(raw) if raw else None
            except (RedisError, json.JSONDecodeError) as exc:
                logger.warning("Redis get failed, using memory cache: %s", exc)
        item = self._memory_cache.get(key)
        if not item:
            return None
        value, expires_at = item
        if expires_at and expires_at < time.time():
            self._memory_cache.pop(key, None)
            return None
        return value


redis_client = RedisClient()
