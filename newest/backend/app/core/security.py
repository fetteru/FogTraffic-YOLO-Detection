"""
Security utilities.

- Password hashing and verification with bcrypt.
- JWT access token creation and decoding.
"""

from datetime import datetime, timedelta

import bcrypt
from jose import jwt

from app.config.settings import settings


def _normalize_password(password: str) -> bytes:
    """Encode and trim passwords to bcrypt's 72-byte limit."""
    max_length = 72
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > max_length:
        password_bytes = password_bytes[:max_length]
    return password_bytes


def hash_password(password: str) -> str:
    """Hash a plaintext password."""
    password_bytes = _normalize_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify that a plaintext password matches a password hash."""
    password_bytes = _normalize_password(plain_password)
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Decode a JWT access token."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
