"""Therapist listing/detail endpoints (PRD F3.3)."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_approved_match
from app.core.enums import Role
from app.db import get_db
from app.models import TherapistProfile, User
from app.schemas.user import TherapistProfileOut, TherapistPublicOut

router = APIRouter(prefix="/therapists", tags=["therapists"])


@router.get("", response_model=list[TherapistPublicOut])
async def list_therapists(
    q: str | None = Query(None, description="按姓名/擅长方向模糊搜索"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TherapistPublicOut]:
    """已审核通过的康复师列表（患者可浏览并发起绑定申请）。"""
    stmt = (
        select(User, TherapistProfile)
        .join(TherapistProfile, TherapistProfile.user_id == User.id)
        .where(
            User.role == Role.THERAPIST.value,
            User.is_active.is_(True),
            TherapistProfile.status == "approved",
        )
    )
    if q:
        stmt = stmt.where(
            (User.full_name.ilike(f"%{q}%"))
            | (TherapistProfile.specialties.ilike(f"%{q}%"))
        )
    rows = (await db.execute(stmt)).all()
    out: list[TherapistPublicOut] = []
    for user, profile in rows:
        out.append(
            TherapistPublicOut(
                id=user.id,
                user_id=user.id,
                full_name=user.full_name,
                organization=profile.organization,
                license_type=profile.license_type,
                specialties=profile.specialties,
                bio=profile.bio,
                status=profile.status,
            )
        )
    return out


@router.get("/{therapist_id}", response_model=TherapistProfileOut)
async def get_therapist_profile(
    therapist_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TherapistProfile:
    """康复师档案详情。仅本人 / 已绑定患者 / 管理员可见全量。"""
    result = await db.execute(
        select(TherapistProfile).where(TherapistProfile.user_id == therapist_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="康复师不存在")

    is_self = current_user.id == therapist_id
    is_admin = current_user.role == Role.ADMIN.value
    is_bound = False
    if current_user.role == Role.PATIENT.value:
        is_bound = (
            await get_approved_match(db, current_user.id, therapist_id)
        ) is not None

    if not (is_self or is_admin or is_bound):
        raise HTTPException(status_code=403, detail="无权查看该康复师档案")

    if profile.status != "approved" and not (is_self or is_admin):
        raise HTTPException(status_code=403, detail="该康复师资质尚未通过审核")
    return profile
