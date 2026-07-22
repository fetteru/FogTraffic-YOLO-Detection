"""RBAC helpers for roles, permissions and bootstrap data."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.config.settings import settings
from app.core.security import hash_password
from app.entity.db_models import Permission, Role, RolePermission, User, UserRole


DEFAULT_PERMISSIONS = [
    {
        "code": "dashboard:view",
        "name": "View dashboard",
        "module": "dashboard",
        "description": "View dashboard statistics and charts",
        "permission_type": "menu",
        "route_path": "/dashboard",
    },
    {
        "code": "history:view",
        "name": "View history",
        "module": "history",
        "description": "View detection history",
        "permission_type": "menu",
        "route_path": "/history",
    },
    {
        "code": "history:delete",
        "name": "Delete history",
        "module": "history",
        "description": "Delete detection history records",
        "permission_type": "button",
        "route_path": "/api/history/*",
    },
    {
        "code": "detection:scan",
        "name": "Single image detection",
        "module": "detection",
        "description": "Run single image detection",
        "permission_type": "api",
        "route_path": "/api/detection/single",
    },
    {
        "code": "detection:batch",
        "name": "Batch image detection",
        "module": "detection",
        "description": "Run batch image detection",
        "permission_type": "api",
        "route_path": "/api/detection/batch",
    },
    {
        "code": "detection:zip",
        "name": "ZIP detection",
        "module": "detection",
        "description": "Run ZIP image detection",
        "permission_type": "api",
        "route_path": "/api/detection/zip",
    },
    {
        "code": "detection:video",
        "name": "Video detection",
        "module": "detection",
        "description": "Run video detection",
        "permission_type": "api",
        "route_path": "/api/detection/video",
    },
    {
        "code": "detection:camera",
        "name": "Camera detection",
        "module": "detection",
        "description": "Run live camera detection",
        "permission_type": "api",
        "route_path": "/api/detection/camera",
    },
    {
        "code": "detection:model:list",
        "name": "List detection models",
        "module": "detection",
        "description": "View available detection models",
        "permission_type": "api",
        "route_path": "/api/detection/models",
    },
    {
        "code": "detection:model:switch",
        "name": "Switch detection model",
        "module": "detection",
        "description": "Choose a model for detection",
        "permission_type": "button",
        "route_path": "/detection",
    },
    {
        "code": "training:view",
        "name": "View training",
        "module": "training",
        "description": "View training tasks",
        "permission_type": "menu",
        "route_path": "/training",
    },
    {
        "code": "training:create",
        "name": "Create training task",
        "module": "training",
        "description": "Create model training tasks",
        "permission_type": "api",
        "route_path": "/api/training/tasks",
    },
    {
        "code": "training:evaluate",
        "name": "Evaluate model",
        "module": "training",
        "description": "Run model evaluation and prediction tests",
        "permission_type": "api",
        "route_path": "/api/training/*",
    },
    {
        "code": "dataset:view",
        "name": "View datasets",
        "module": "dataset",
        "description": "View dataset assets",
        "permission_type": "menu",
        "route_path": "/datasets",
    },
    {
        "code": "dataset:manage",
        "name": "Manage datasets",
        "module": "dataset",
        "description": "Convert, verify and manage datasets",
        "permission_type": "button",
        "route_path": "/datasets",
    },
    {
        "code": "agent:chat",
        "name": "Use AI chat",
        "module": "agent",
        "description": "Use the multi-agent chat workflow",
        "permission_type": "api",
        "route_path": "/api/chat/*",
    },
    {
        "code": "knowledge:view",
        "name": "View knowledge base",
        "module": "knowledge",
        "description": "Search local knowledge base",
        "permission_type": "api",
        "route_path": "/api/knowledge/*",
    },
    {
        "code": "knowledge:reload",
        "name": "Reload knowledge base",
        "module": "knowledge",
        "description": "Reload or rebuild local knowledge index",
        "permission_type": "button",
        "route_path": "/api/knowledge/reload",
    },
    {
        "code": "system:user:list",
        "name": "List users",
        "module": "system",
        "description": "View platform users",
        "permission_type": "menu",
        "route_path": "/users",
    },
    {
        "code": "system:user:roles",
        "name": "Assign user roles",
        "module": "system",
        "description": "Assign or remove roles from users",
        "permission_type": "button",
        "route_path": "/api/user/*/roles",
    },
    {
        "code": "system:role:list",
        "name": "List roles",
        "module": "system",
        "description": "View platform roles",
        "permission_type": "menu",
        "route_path": "/roles",
    },
    {
        "code": "system:role:manage",
        "name": "Manage roles",
        "module": "system",
        "description": "Create, update and delete roles",
        "permission_type": "button",
        "route_path": "/api/role/*",
    },
    {
        "code": "system:permission:list",
        "name": "List permissions",
        "module": "system",
        "description": "View permission definitions",
        "permission_type": "api",
        "route_path": "/api/permission/list",
    },
    {
        "code": "system:settings",
        "name": "System settings",
        "module": "system",
        "description": "Edit local UI and service settings",
        "permission_type": "menu",
        "route_path": "/settings",
    },
]


DEFAULT_ROLES = [
    {
        "name": "admin",
        "display_name": "Administrator",
        "description": "Full platform administration",
        "is_system": True,
    },
    {
        "name": "operator",
        "display_name": "Operator",
        "description": "Daily detection, training and analysis operations",
        "is_system": True,
    },
    {
        "name": "viewer",
        "display_name": "Viewer",
        "description": "Read-only dashboard and history access",
        "is_system": True,
    },
]


OPERATOR_PERMISSIONS = {
    "dashboard:view",
    "history:view",
    "detection:scan",
    "detection:batch",
    "detection:zip",
    "detection:video",
    "detection:camera",
    "detection:model:list",
    "detection:model:switch",
    "training:view",
    "training:create",
    "training:evaluate",
    "dataset:view",
    "dataset:manage",
    "agent:chat",
    "knowledge:view",
    "system:settings",
}

VIEWER_PERMISSIONS = {
    "dashboard:view",
    "history:view",
    "detection:model:list",
    "dataset:view",
    "agent:chat",
    "knowledge:view",
    "system:settings",
}


def ensure_rbac_seed(db: Session, commit: bool = False) -> None:
    """Create built-in permissions, roles and baseline assignments."""

    created_role_names: set[str] = set()
    for item in DEFAULT_PERMISSIONS:
        permission = db.query(Permission).filter(Permission.code == item["code"]).first()
        if permission is None:
            permission = Permission(**item)
            db.add(permission)
            continue
        for field, value in item.items():
            if getattr(permission, field, None) != value:
                setattr(permission, field, value)

    for item in DEFAULT_ROLES:
        role = db.query(Role).filter(Role.name == item["name"]).first()
        if role is None:
            role = Role(**item, role_code=item["name"])
            db.add(role)
            created_role_names.add(item["name"])
            continue
        role.display_name = item["display_name"]
        role.description = item["description"]
        role.is_system = item["is_system"]
        if not role.role_code:
            role.role_code = role.name

    db.flush()
    _ensure_default_admin(db)
    seed_system_defaults = db.query(RolePermission.id).first() is None
    _ensure_role_permissions(db, created_role_names, seed_system_defaults)
    _backfill_user_roles(db)
    if commit:
        db.commit()


def get_user_role_names(db: Session, user: User) -> list[str]:
    """Return role codes assigned to a user."""

    rows = (
        db.query(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user.id)
        .order_by(Role.id.asc())
        .all()
    )
    return [row[0] for row in rows]


def get_user_role_details(db: Session, user: User) -> list[dict]:
    """Return role objects assigned to a user."""

    roles = (
        db.query(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user.id)
        .order_by(Role.id.asc())
        .all()
    )
    return [serialize_role(role) for role in roles]


def get_user_permission_codes(db: Session, user: User) -> list[str]:
    """Return permission codes granted to a user."""

    if user.is_superuser:
        rows = db.query(Permission.code).order_by(Permission.module.asc(), Permission.code.asc()).all()
        return [row[0] for row in rows]
    rows = (
        db.query(Permission.code, Permission.module)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .filter(UserRole.user_id == user.id)
        .distinct()
        .order_by(Permission.module.asc(), Permission.code.asc())
        .all()
    )
    return [row[0] for row in rows]


def user_has_permission(db: Session, user: User, permission_code: str) -> bool:
    """Check whether a user has a permission."""

    if user.is_superuser:
        return True
    exists = (
        db.query(Permission.id)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .filter(UserRole.user_id == user.id, Permission.code == permission_code)
        .first()
    )
    return exists is not None


def user_is_admin(db: Session, user: User) -> bool:
    """Return True for superusers and users with the admin role."""

    if user.is_superuser:
        return True
    return "admin" in get_user_role_names(db, user)


def assign_roles_to_user(db: Session, user_id: int, role_ids: list[int]) -> None:
    """Replace a user's role assignments."""

    db.query(UserRole).filter(UserRole.user_id == user_id).delete()
    for role_id in role_ids:
        if db.query(Role.id).filter(Role.id == role_id).first():
            db.add(UserRole(user_id=user_id, role_id=role_id))


def assign_role_names_to_user(db: Session, user: User, role_names: list[str]) -> None:
    """Replace a user's role assignments by role code."""

    roles = db.query(Role).filter(Role.name.in_(role_names)).all()
    assign_roles_to_user(db, user.id, [role.id for role in roles])


def serialize_permission(permission: Permission) -> dict:
    """Serialize a permission row for API responses."""

    return {
        "id": permission.id,
        "code": permission.code,
        "name": permission.name,
        "module": permission.module,
        "description": permission.description,
        "permission_type": permission.permission_type,
        "parent_id": permission.parent_id,
        "route_path": permission.route_path,
    }


def serialize_role(role: Role) -> dict:
    """Serialize a role row for API responses."""

    return {
        "id": role.id,
        "name": role.name,
        "display_name": role.display_name,
        "description": role.description,
        "is_system": role.is_system,
        "role_code": role.role_code,
        "created_at": role.created_at,
    }


def _ensure_role_permissions(
    db: Session,
    created_role_names: set[str] | None = None,
    seed_system_defaults: bool = False,
) -> None:
    permissions = {item.code: item for item in db.query(Permission).all()}
    roles = {item.name: item for item in db.query(Role).all()}
    created_role_names = created_role_names or set()
    role_permissions = {
        "admin": set(permissions),
        "operator": OPERATOR_PERMISSIONS,
        "viewer": VIEWER_PERMISSIONS,
    }
    for role_name, permission_codes in role_permissions.items():
        if role_name not in created_role_names and not seed_system_defaults:
            continue
        role = roles.get(role_name)
        if not role:
            continue
        existing_ids = {
            row[0]
            for row in db.query(RolePermission.permission_id).filter(
                RolePermission.role_id == role.id
            )
        }
        for code in permission_codes:
            permission = permissions.get(code)
            if permission and permission.id not in existing_ids:
                db.add(RolePermission(role_id=role.id, permission_id=permission.id))


def _backfill_user_roles(db: Session) -> None:
    admin = db.query(Role).filter(Role.name == "admin").first()
    operator = db.query(Role).filter(Role.name == "operator").first()
    if not admin or not operator:
        return
    users = db.query(User).all()
    for user in users:
        has_role = db.query(UserRole.id).filter(UserRole.user_id == user.id).first()
        if has_role:
            continue
        role = admin if user.is_superuser else operator
        db.add(UserRole(user_id=user.id, role_id=role.id))


def _ensure_default_admin(db: Session) -> None:
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        return

    admin_user = db.query(User).filter(User.username == settings.DEFAULT_ADMIN_USERNAME).first()
    if admin_user is None:
        admin_user = User(
            username=settings.DEFAULT_ADMIN_USERNAME,
            email=settings.DEFAULT_ADMIN_EMAIL,
            hashed_password=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
            is_active=True,
            is_superuser=True,
        )
        db.add(admin_user)
        db.flush()
    else:
        admin_user.is_active = True
        admin_user.is_superuser = True

    db.query(User).filter(
        User.username != settings.DEFAULT_ADMIN_USERNAME,
        User.is_superuser == True,
    ).update({"is_superuser": False}, synchronize_session=False)

    admin_role_rows = (
        db.query(UserRole)
        .filter(UserRole.user_id == admin_user.id, UserRole.role_id == admin_role.id)
        .order_by(UserRole.id.asc())
        .all()
    )
    if not admin_role_rows:
        db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))
        db.flush()
        return

    for duplicate in admin_role_rows[1:]:
        db.delete(duplicate)
