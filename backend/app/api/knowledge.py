"""Knowledge-base management API."""

from fastapi import APIRouter, Depends, Query

from app.api.auth import get_current_user
from app.rag.retriever import knowledge_retriever

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/search")
async def search_knowledge(
    q: str = Query(..., min_length=1),
    top_k: int = Query(4, ge=1, le=10),
    current_user=Depends(get_current_user),
):
    return {"items": knowledge_retriever.search(q, top_k=top_k)}


@router.post("/reload")
async def reload_knowledge(current_user=Depends(get_current_user)):
    return {"chunks": knowledge_retriever.reload()}
