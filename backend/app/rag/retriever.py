"""Simple local semantic-ish retriever.

This implementation intentionally avoids mandatory vector database setup. It
uses token overlap scoring so the Day11 RAG flow works immediately, then can be
replaced by pgvector embeddings later.
"""

from __future__ import annotations

import math
import re
from pathlib import Path

from app.config.settings import settings
from app.rag.document_loader import load_documents


class KnowledgeRetriever:
    """Search local knowledge-base chunks."""

    def __init__(self, root: str | Path | None = None) -> None:
        self.root = Path(root or settings.KNOWLEDGE_BASE_DIR)
        self._documents: list[dict] = []
        self._index: list[dict] = []
        self.reload()

    def reload(self) -> int:
        self._documents = load_documents(self.root)
        self._index = [
            {
                **doc,
                "tokens": _tokenize(doc["content"]),
            }
            for doc in self._documents
        ]
        return len(self._documents)

    def search(self, query: str, top_k: int = 4) -> list[dict]:
        query_tokens = _tokenize(query)
        if not query_tokens:
            return []
        scored = []
        for doc in self._index:
            score = _score(query_tokens, doc["tokens"])
            if score > 0:
                scored.append((score, doc))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [
            {
                "source": doc["source"],
                "chunk_id": doc["chunk_id"],
                "title": doc.get("title", ""),
                "header_context": doc.get("header_context", ""),
                "content": doc["content"],
                "score": round(score, 4),
                "similarity": round(score, 4),
                "metadata": {
                    "source": doc["source"],
                    "title": doc.get("title", ""),
                    "header_context": doc.get("header_context", ""),
                    "chunk_index": doc["chunk_id"],
                },
            }
            for score, doc in scored[:top_k]
        ]


def _tokenize(text: str) -> dict[str, int]:
    counts: dict[str, int] = {}

    def add(token: str, weight: int = 1) -> None:
        if len(token) <= 1:
            return
        counts[token] = counts.get(token, 0) + weight

    for token in re.findall(r"[a-z0-9_]+|[\u4e00-\u9fff]+", text.lower()):
        if re.fullmatch(r"[\u4e00-\u9fff]+", token):
            add(token, 2 if len(token) <= 8 else 1)
            for size in (2, 3, 4):
                for index in range(0, max(0, len(token) - size + 1)):
                    add(token[index : index + size])
        else:
            add(token, 2)
    return counts


def _score(query: dict[str, int], document: dict[str, int]) -> float:
    dot = sum(count * document.get(token, 0) for token, count in query.items())
    if dot <= 0:
        return 0.0
    query_norm = math.sqrt(sum(value * value for value in query.values()))
    doc_norm = math.sqrt(sum(value * value for value in document.values()))
    return dot / (query_norm * doc_norm) if query_norm and doc_norm else 0.0


knowledge_retriever = KnowledgeRetriever()
