"""Detection history API routes."""

from fastapi import APIRouter, Depends, Query

from app.api.auth import get_current_user
from app.services.history_service import history_service

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/tasks")
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    task_type: str | None = None,
    status: str | None = None,
    scene_id: int | None = None,
    keyword: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    current_user=Depends(get_current_user),
):
    return history_service.list_tasks(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        task_type=task_type,
        status=status,
        scene_id=scene_id,
        keyword=keyword,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/tasks/{task_id}")
async def get_task_detail(task_id: int, current_user=Depends(get_current_user)):
    return history_service.get_task_detail(user_id=current_user.id, task_id=task_id)


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, current_user=Depends(get_current_user)):
    return history_service.delete_task(user_id=current_user.id, task_id=task_id)


@router.get("/summary")
async def get_summary(current_user=Depends(get_current_user)):
    return history_service.get_summary(user_id=current_user.id)


@router.get("/scenes")
async def list_scenes(current_user=Depends(get_current_user)):
    return history_service.list_scenes(user_id=current_user.id)
