"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.core.security import decode_access_token
from app.database.session import get_db
from app.entity.schemas import TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.user_service import user_service


router = APIRouter(prefix="/api/auth", tags=["认证"])
bearer_scheme = HTTPBearer(auto_error=False)
logger = get_logger(__name__)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Resolve the current user from a JWT bearer token."""
    credentials_exception = HTTPException(
        status_code=401,
        detail="无效的认证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise credentials_exception

    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    return user_service.get_user_by_id(db, user_id)


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(request: UserRegister, db: Session = Depends(get_db)):
    """Register a user."""
    user = user_service.register(
        db=db,
        username=request.username,
        email=request.email,
        password=request.password,
    )
    logger.info("User registered successfully: username=%s user_id=%s", user.username, user.id)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLogin, db: Session = Depends(get_db)):
    """Login and return a JWT access token."""
    user = user_service.login(
        db=db,
        username=request.username,
        password=request.password,
    )
    logger.info("User logged in successfully: username=%s user_id=%s", user.username, user.id)
    access_token = user_service.create_access_token_for_user(user)
    roles = user_service.get_user_roles(db, user)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatar": user.avatar,
            "roles": roles,
        },
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current logged-in user information."""
    roles = user_service.get_user_roles(db, current_user)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "phone": current_user.phone,
        "avatar": current_user.avatar,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "roles": roles,
        "last_login_at": current_user.last_login_at,
        "created_at": current_user.created_at,
    }
