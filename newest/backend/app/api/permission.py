"""Permission management API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.entity.db_models import Permission
from app.middleware.permission_checker import require_admin
from app.services.rbac_service import serialize_permission

router = APIRouter(prefix="/api/permission", tags=["permission"])


@router.get("/list")
async def list_permissions(
    _current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all platform permission definitions."""

    permissions = (
        db.query(Permission)
        .order_by(Permission.module.asc(), Permission.code.asc())
        .all()
    )
    return {"permissions": [serialize_permission(item) for item in permissions]}
