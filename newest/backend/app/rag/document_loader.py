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
        title = _document_title(text, path)
        for index, item in enumerate(split_document_text(text)):
            documents.append(
                {
                    "source": str(path.relative_to(base)),
                    "chunk_id": index,
                    "title": title,
                    "header_context": item["header_context"] or title,
                    "content": item["content"],
                }
            )
    return documents


def split_document_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """Split text by paragraphs while keeping Markdown header context."""
    cleaned = "\n".join(line.rstrip() for line in text.splitlines()).strip()
    if not cleaned:
        return []

    paragraphs = [item.strip() for item in cleaned.split("\n\n") if item.strip()]
    chunks = []
    current = ""
    headers: list[tuple[int, str]] = []

    for paragraph in paragraphs:
        if paragraph.startswith("#"):
            level = len(paragraph) - len(paragraph.lstrip("#"))
            title = paragraph.lstrip("#").strip()
            headers = [item for item in headers if item[0] < level]
            headers.append((level, title))

        if current and len(current) + len(paragraph) + 2 > chunk_size:
            chunks.append({"content": current.strip(), "header_context": _header_context(headers)})
            current = current[-overlap:].strip()
        current = f"{current}\n\n{paragraph}".strip() if current else paragraph

    if current:
        chunks.append({"content": current.strip(), "header_context": _header_context(headers)})
    return chunks


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Backward-compatible plain chunk list."""
    return [item["content"] for item in split_document_text(text, chunk_size, overlap)]


def _document_title(text: str, path: Path) -> str:
    for line in text.splitlines():
        if line.startswith("#"):
            return line.lstrip("#").strip() or path.stem
    return path.stem


def _header_context(headers: list[tuple[int, str]]) -> str:
    return " > ".join(title for _, title in headers)
