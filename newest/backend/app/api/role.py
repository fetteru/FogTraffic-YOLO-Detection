"""Role management API routes."""

from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.database.session import get_db
from app.entity.db_models import Permission, Role, RolePermission
from app.middleware.permission_checker import require_admin
from app.services.rbac_service import serialize_permission, serialize_role

logger = get_logger(__name__)
router = APIRouter(prefix="/api/role", tags=["role"])


class RoleCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class RoleUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class PermissionIdsRequest(BaseModel):
    permission_ids: list[int] = Field(default_factory=list)


@router.get("/list")
async def list_roles(
    _current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List platform roles."""

    roles = db.query(Role).order_by(Role.id.asc()).all()
    return {"roles": [serialize_role(role) for role in roles]}


@router.post("", status_code=201)
async def create_role(
    request: RoleCreateRequest,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a custom role."""

    existing = db.query(Role).filter(Role.name == request.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    role = Role(
        name=request.name,
        role_code=request.name,
        display_name=request.display_name,
        description=request.description,
        is_system=False,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    logger.info("User %s created role %s", current_user.username, role.name)
    return serialize_role(role)


@router.put("/{role_id}")
async def update_role(
    role_id: int,
    request: RoleUpdateRequest,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a custom role."""

    role = _get_role(db, role_id)
    if role.is_system:
        raise HTTPException(status_code=400, detail="System roles cannot be edited")
    if request.display_name is not None:
        role.display_name = request.display_name
    if request.description is not None:
        role.description = request.description
    db.commit()
    db.refresh(role)
    logger.info("User %s updated role %s", current_user.username, role.name)
    return serialize_role(role)


@router.delete("/{role_id}")
async def delete_role(
    role_id: int,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a custom role."""

    role = _get_role(db, role_id)
    if role.is_system:
        raise HTTPException(status_code=400, detail="System roles cannot be deleted")
    name = role.name
    db.delete(role)
    db.commit()
    logger.info("User %s deleted role %s", current_user.username, name)
    return {"message": f"Role {name} deleted"}


@router.get("/{role_id}/permissions")
async def get_role_permissions(
    role_id: int,
    _current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List permissions assigned to a role."""

    role = _get_role(db, role_id)
    permissions = (
        db.query(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id == role.id)
        .order_by(Permission.module.asc(), Permission.code.asc())
        .all()
    )
    return {
        "role": serialize_role(role),
        "permissions": [serialize_permission(permission) for permission in permissions],
    }


@router.post("/{role_id}/permissions")
async def assign_permissions(
    role_id: int,
    request: PermissionIdsRequest,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Replace a role's permission assignments."""

    role = _get_role(db, role_id)
    permission_ids = set(request.permission_ids)
    valid_permission_ids = {
        row[0] for row in db.query(Permission.id).filter(Permission.id.in_(permission_ids)).all()
    }
    db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
    for permission_id in valid_permission_ids:
        db.add(RolePermission(role_id=role.id, permission_id=permission_id))
    db.commit()
    logger.info(
        "User %s assigned %d permissions to role %s",
        current_user.username,
        len(valid_permission_ids),
        role.name,
    )
    return {"message": "Permissions updated", "count": len(valid_permission_ids)}


@router.delete("/{role_id}/permissions/{permission_id}")
async def remove_permission(
    role_id: int,
    permission_id: int,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Remove a single permission from a role."""

    role = _get_role(db, role_id)
    removed = (
        db.query(RolePermission)
        .filter(
            RolePermission.role_id == role.id,
            RolePermission.permission_id == permission_id,
        )
        .delete()
    )
    db.commit()
    logger.info(
        "User %s removed permission %s from role %s",
        current_user.username,
        permission_id,
        role.name,
    )
    return {"message": "Permission removed", "count": removed}


def _get_role(db: Session, role_id: int) -> Role:
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role
