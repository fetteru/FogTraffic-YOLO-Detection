"""Conversation memory backed by Redis with in-process fallback."""

from __future__ import annotations

from app.config.settings import settings
from app.storage.redis_client import redis_client


class ConversationMemory:
    """Store short chat history per session."""

    def __init__(self, max_messages: int | None = None, ttl_seconds: int | None = None) -> None:
        self.max_messages = max_messages or settings.AGENT_MEMORY_MAX_MESSAGES
        self.ttl_seconds = ttl_seconds or settings.AGENT_MEMORY_TTL_SECONDS

    def get_messages(self, session_id: str) -> list[dict]:
        payload = redis_client.get_json(self._key(session_id)) or {}
        messages = payload.get("messages", [])
        return messages if isinstance(messages, list) else []

    def append(self, session_id: str, role: str, content: str) -> list[dict]:
        messages = self.get_messages(session_id)
        messages.append({"role": role, "content": content})
        messages = messages[-self.max_messages :]
        redis_client.set_json(self._key(session_id), {"messages": messages}, expire=self.ttl_seconds)
        return messages

    def clear(self, session_id: str) -> None:
        redis_client.set_json(self._key(session_id), {"messages": []}, expire=self.ttl_seconds)

    @staticmethod
    def _key(session_id: str) -> str:
        return f"agent:memory:{session_id}"


conversation_memory = ConversationMemory()
