"""FastAPI dependencies: DB session, current user, RBAC, data-level access checks."""
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import MatchStatus, Role
from app.core.security import TokenError, decode_token
from app.db import get_db
from app.models import Match, User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> User:
    """Validate access token and load the active user."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="令牌缺少用户标识")
    user = await db.get(User, UUID(user_id))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或已停用")
    return user


def require_roles(*roles: Role) -> callable:
    """RBAC dependency factory: current user must hold one of the given roles."""

    async def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in {r.value for r in roles}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足：需要角色 {'/'.join(r.value for r in roles)}",
            )
        return current_user

    return _checker


async def get_approved_match(
    db: AsyncSession, patient_id: UUID, therapist_id: UUID
) -> Optional[Match]:
    """Return the approved match between a patient and a therapist, if any."""
    result = await db.execute(
        select(Match).where(
            Match.patient_id == patient_id,
            Match.therapist_id == therapist_id,
            Match.status == MatchStatus.APPROVED.value,
        )
    )
    return result.scalar_one_or_none()


async def get_any_approved_match(db: AsyncSession, user_id: UUID) -> Optional[Match]:
    """Return the user's active approved match (as patient or therapist)."""
    result = await db.execute(
        select(Match).where(
            ((Match.patient_id == user_id) | (Match.therapist_id == user_id)),
            Match.status == MatchStatus.APPROVED.value,
        )
    )
    return result.scalars().first()


async def ensure_patient_access(
    db: AsyncSession, patient_id: UUID, current_user: User
) -> None:
    """Data-level access: patient self / bound therapist / admin. Raises 403 otherwise."""
    if current_user.role == Role.ADMIN.value:
        return
    if current_user.role == Role.PATIENT.value:
        if current_user.id == patient_id:
            return
        raise HTTPException(status_code=403, detail="只能访问自己的数据")
    if current_user.role == Role.THERAPIST.value:
        match = await get_approved_match(db, patient_id, current_user.id)
        if match is None:
            raise HTTPException(
                status_code=403, detail="该患者未与你建立绑定关系，无法访问"
            )
        return
    raise HTTPException(status_code=403, detail="无权访问")


async def ensure_binding_between(db: AsyncSession, user_a: UUID, user_b: UUID) -> None:
    """Messaging guard: only approved patient-therapist pairs can exchange messages."""
    match = await get_approved_match(db, user_a, user_b)
    if match is None:
        match = await get_approved_match(db, user_b, user_a)
    if match is None:
        raise HTTPException(status_code=403, detail="仅绑定关系双方可以互发消息")
