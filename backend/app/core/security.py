"""Password hashing (bcrypt) and JWT token helpers."""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

import bcrypt
import jwt

from app.core.config import settings


class TokenError(Exception):
    """Raised when a token is invalid/expired/wrong type."""


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt (cost default 12)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def _create_token(
    token_type: str,
    subject: str,
    role: str,
    expires_delta: timedelta,
    jti: Optional[str] = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": token_type,
        "jti": jti or uuid4().hex,  # unique per token, even within same second
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, role: str) -> str:
    return _create_token(
        "access",
        subject,
        role,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(subject: str, role: str) -> tuple[str, str]:
    """Return (token, jti). The jti is persisted server-side for revocation."""
    jti = uuid4().hex
    token = _create_token(
        "refresh",
        subject,
        role,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        jti=jti,
    )
    return token, jti


def decode_token(token: str, expected_type: Optional[str] = None) -> dict[str, Any]:
    """Decode + verify signature/expiry. Optionally enforce token type."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.PyJWTError as exc:  # ExpiredSignatureError, InvalidTokenError, ...
        raise TokenError("invalid or expired token") from exc
    if expected_type and payload.get("type") != expected_type:
        raise TokenError(f"expected a {expected_type} token")
    return payload
