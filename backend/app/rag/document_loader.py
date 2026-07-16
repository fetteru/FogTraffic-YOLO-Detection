"""Load and chunk local knowledge-base documents."""

from __future__ import annotations

from pathlib import Path


def load_documents(root: str | Path) -> list[dict]:
    """Load Markdown and text documents from a directory."""
    base = Path(root)
    if not base.exists():
        return []

    documents = []
    for path in sorted(base.rglob("*")):
        if path.suffix.lower() not in {".md", ".txt"} or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for index, chunk in enumerate(chunk_text(text)):
            documents.append(
                {
                    "source": str(path.relative_to(base)),
                    "chunk_id": index,
                    "content": chunk,
                }
            )
    return documents


def chunk_text(text: str, chunk_size: int = 700, overlap: int = 120) -> list[str]:
    """Split text into overlapping chunks."""
    cleaned = "\n".join(line.rstrip() for line in text.splitlines()).strip()
    if not cleaned:
        return []
    chunks = []
    start = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(cleaned):
            break
        start = max(0, end - overlap)
    return chunks
