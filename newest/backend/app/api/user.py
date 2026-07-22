"""User query and profile API routes."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database.session import get_db
from app.entity.schemas import ChangePassword, UserResponse, UserUpdate
from app.middleware.permission_checker import require_admin
from app.services.user_service import user_service

router = APIRouter(prefix="/api/user", tags=["user"])


class RoleIdsRequest(BaseModel):
    role_ids: list[int] = Field(default_factory=list)


@router.get("/list")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: str | None = None,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return user_service.list_users(db, page=page, page_size=page_size, keyword=keyword)


@router.get("/roles")
async def list_roles(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return user_service.list_roles(db)


@router.get("/{user_id}/roles")
async def get_user_roles(
    user_id: int,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = user_service.get_user_by_id(db, user_id)
    return {
        "user_id": user.id,
        "roles": user_service.get_user_role_details(db, user),
        "permissions": user_service.get_user_permissions(db, user),
    }


@router.post("/{user_id}/roles")
async def assign_user_roles(
    user_id: int,
    request: RoleIdsRequest,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return user_service.set_user_roles(db, user_id, request.role_ids)


@router.delete("/{user_id}/roles/{role_id}")
async def remove_user_role(
    user_id: int,
    role_id: int,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return user_service.remove_user_role(db, user_id, role_id)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    request: UserUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = user_service.update_profile(
        db,
        current_user,
        email=request.email,
        phone=request.phone,
        avatar=request.avatar,
    )
    roles = user_service.get_user_roles(db, user)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "avatar": user.avatar,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "roles": roles,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
    }


@router.put("/password")
async def change_password(
    request: ChangePassword,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.change_password(
        db,
        current_user,
        old_password=request.old_password,
        new_password=request.new_password,
    )
