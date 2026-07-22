"""Knowledge-base management API."""

from fastapi import APIRouter, Depends, Query

from app.middleware.permission_checker import require_permission
from app.rag.retriever import knowledge_retriever

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/search")
async def search_knowledge(
    q: str = Query(..., min_length=1),
    top_k: int = Query(4, ge=1, le=10),
    current_user=Depends(require_permission("knowledge:view")),
):
    return {"items": knowledge_retriever.search(q, top_k=top_k)}


@router.post("/reload")
async def reload_knowledge(current_user=Depends(require_permission("knowledge:reload"))):
    return {"chunks": knowledge_retriever.reload()}
