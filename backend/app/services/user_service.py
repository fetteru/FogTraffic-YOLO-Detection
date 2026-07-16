"""User service layer."""

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.entity.db_models import Role, User


class UserService:
    """Handle user registration, login, profile and query operations."""

    @staticmethod
    def register(db: Session, username: str, email: str, password: str) -> User:
        """Register a new user."""
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="用户名已存在")

        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="邮箱已被注册")

        new_user = User(
            username=username,
            email=email,
            hashed_password=hash_password(password),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def login(db: Session, username: str, password: str) -> User:
        """Login with username or email and password."""
        user = (
            db.query(User)
            .filter(or_(User.username == username, User.email == username))
            .first()
        )
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        return user

    @staticmethod
    def create_access_token_for_user(user: User) -> str:
        """Create a JWT access token for a user."""
        return create_access_token(data={"sub": str(user.id)})

    @staticmethod
    def get_user_roles(db: Session, user: User) -> list[str]:
        """Get role codes for a user."""
        return [user_role.role.name for user_role in user.user_roles]

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        """Get a user by id."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        return user

    @staticmethod
    def list_users(db: Session, page: int = 1, page_size: int = 20, keyword: str | None = None) -> dict:
        """List users with pagination."""
        query = db.query(User)
        if keyword:
            like = f"%{keyword}%"
            query = query.filter(or_(User.username.ilike(like), User.email.ilike(like)))
        total = query.count()
        users = (
            query.order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size else 0,
            "items": [
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "phone": user.phone,
                    "avatar": user.avatar,
                    "is_active": user.is_active,
                    "is_superuser": user.is_superuser,
                    "roles": UserService.get_user_roles(db, user),
                    "created_at": user.created_at,
                }
                for user in users
            ],
        }

    @staticmethod
    def list_roles(db: Session) -> dict:
        """List all roles."""
        roles = db.query(Role).order_by(Role.id.asc()).all()
        return {
            "items": [
                {
                    "id": role.id,
                    "name": role.name,
                    "display_name": role.display_name,
                    "description": role.description,
                    "is_system": role.is_system,
                    "created_at": role.created_at,
                }
                for role in roles
            ]
        }

    @staticmethod
    def update_profile(
        db: Session,
        user: User,
        email: str | None = None,
        phone: str | None = None,
        avatar: str | None = None,
    ) -> User:
        """Update current user's editable profile fields."""
        if email and email != user.email:
            existing = db.query(User).filter(User.email == email, User.id != user.id).first()
            if existing:
                raise HTTPException(status_code=400, detail="邮箱已被注册")
            user.email = email
        if phone is not None:
            user.phone = phone
        if avatar is not None:
            user.avatar = avatar
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def change_password(db: Session, user: User, old_password: str, new_password: str) -> dict:
        """Change current user's password."""
        if not verify_password(old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="旧密码不正确")
        user.hashed_password = hash_password(new_password)
        db.commit()
        return {"message": "密码修改成功"}


user_service = UserService()
