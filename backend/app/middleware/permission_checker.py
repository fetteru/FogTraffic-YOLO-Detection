"""FastAPI permission dependencies."""

from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database.session import get_db
from app.services.rbac_service import user_has_permission, user_is_admin


def require_permission(permission_code: str):
    """Require one RBAC permission for an endpoint."""

    async def checker(
        current_user=Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        if not user_has_permission(db, current_user, permission_code):
            raise HTTPException(
                status_code=403,
                detail=f"Permission required: {permission_code}",
            )
        return current_user

    return checker


async def require_admin(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Require superuser or admin role."""

    if not user_is_admin(db, current_user):
        raise HTTPException(status_code=403, detail="Administrator access required")
    return current_user
