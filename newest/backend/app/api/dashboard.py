"""Dashboard API routes."""

from fastapi import APIRouter, Depends, Query

from app.middleware.permission_checker import require_permission
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/statistics")
async def get_statistics(
    days: int = Query(30, ge=1, le=365),
    current_user=Depends(require_permission("dashboard:view")),
):
    return dashboard_service.get_statistics(user_id=current_user.id, days=days)


@router.get("/trend")
async def get_trend(
    days: int = Query(30, ge=1, le=365),
    current_user=Depends(require_permission("dashboard:view")),
):
    return dashboard_service.get_trend(user_id=current_user.id, days=days)


@router.get("/class-dist")
async def get_class_distribution(
    days: int = Query(30, ge=1, le=365),
    current_user=Depends(require_permission("dashboard:view")),
):
    return dashboard_service.get_class_distribution(user_id=current_user.id, days=days)


@router.get("/scene-dist")
async def get_scene_distribution(
    days: int = Query(30, ge=1, le=365),
    current_user=Depends(require_permission("dashboard:view")),
):
    return dashboard_service.get_scene_distribution(user_id=current_user.id, days=days)


@router.get("/type-dist")
async def get_type_distribution(
    days: int = Query(30, ge=1, le=365),
    current_user=Depends(require_permission("dashboard:view")),
):
    return dashboard_service.get_type_distribution(user_id=current_user.id, days=days)
