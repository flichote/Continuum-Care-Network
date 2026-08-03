"""Auth endpoints: register, login, refresh, logout (PRD F1)."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.enums import Role
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db import get_db as db_dep
from app.models import PatientProfile, RefreshToken, TherapistProfile, User
from app.schemas.user import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.services.audit import log_action

router = APIRouter(prefix="/auth", tags=["auth"])


async def _find_user_by_account(db: AsyncSession, account: str) -> User | None:
    if "@" in account:
        result = await db.execute(select(User).where(User.email == account.lower()))
    else:
        result = await db.execute(select(User).where(User.phone == account))
    return result.scalar_one_or_none()


def _issue_tokens(user: User) -> TokenPair:
    access = create_access_token(str(user.id), user.role)
    refresh, jti = create_refresh_token(str(user.id), user.role)
    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    ), jti


async def _persist_refresh_token(
    db: AsyncSession, user: User, jti: str
) -> None:
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=jti,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest, request: Request, db: AsyncSession = Depends(db_dep)
) -> TokenPair:
    """注册（患者/康复师）。管理员账号由种子数据创建。"""
    if not payload.phone and not payload.email:
        raise HTTPException(status_code=422, detail="手机号与邮箱至少填写一个")

    if payload.phone:
        existing = await db.execute(
            select(User).where(User.phone == payload.phone)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="该手机号已被注册")
    if payload.email:
        existing = await db.execute(
            select(User).where(User.email == payload.email.lower())
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="该邮箱已被注册")

    user = User(
        phone=payload.phone,
        email=payload.email.lower() if payload.email else None,
        password_hash=hash_password(payload.password),
        role=payload.role,
        full_name=payload.full_name,
    )
    db.add(user)
    await db.flush()

    if payload.role == Role.PATIENT.value:
        db.add(PatientProfile(user_id=user.id))
    elif payload.role == Role.THERAPIST.value:
        db.add(TherapistProfile(user_id=user.id, status="pending"))

    await log_action(
        db,
        actor_id=user.id,
        action="auth.register",
        resource_type="user",
        resource_id=user.id,
        ip=request.client.host if request.client else None,
    )

    pair, jti = _issue_tokens(user)
    await _persist_refresh_token(db, user, jti)
    return pair


@router.post("/login", response_model=TokenPair)
async def login(
    payload: LoginRequest, request: Request, db: AsyncSession = Depends(db_dep)
) -> TokenPair:
    """账号（手机号或邮箱）+ 密码登录，签发 access + refresh token。"""
    user = await _find_user_by_account(db, payload.account)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="账号或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已被停用")

    user.last_login_at = datetime.now(timezone.utc)
    await log_action(
        db,
        actor_id=user.id,
        action="auth.login",
        resource_type="user",
        resource_id=user.id,
        ip=request.client.host if request.client else None,
    )
    pair, jti = _issue_tokens(user)
    await _persist_refresh_token(db, user, jti)
    return pair


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    payload: RefreshRequest, db: AsyncSession = Depends(db_dep)
) -> TokenPair:
    """用 refresh token 换取新的 access token（并轮换 refresh token）。"""
    try:
        data = decode_token(payload.refresh_token, expected_type="refresh")
    except TokenError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    jti = data.get("jti")
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.jti == jti)
    )
    stored = result.scalar_one_or_none()
    if stored is None or stored.revoked:
        raise HTTPException(status_code=401, detail="refresh token 已失效")
    # SQLite 返回 naive datetime，PostgreSQL 返回 aware；统一按 UTC 比较
    expires_at = stored.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="refresh token 已过期")

    user = await db.get(User, uuid.UUID(data["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或已停用")

    # rotate: revoke old, issue new
    stored.revoked = True
    stored.revoked_at = datetime.now(timezone.utc)

    pair, new_jti = _issue_tokens(user)
    await _persist_refresh_token(db, user, new_jti)
    return pair


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest, db: AsyncSession = Depends(db_dep)
) -> None:
    """撤销 refresh token（服务端注销）。"""
    try:
        data = decode_token(payload.refresh_token, expected_type="refresh")
    except TokenError:
        # Already invalid tokens are treated as logged out
        return
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.jti == data.get("jti"))
    )
    stored = result.scalar_one_or_none()
    if stored is not None and not stored.revoked:
        stored.revoked = True
        stored.revoked_at = datetime.now(timezone.utc)
