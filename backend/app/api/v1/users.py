"""User endpoints: /users/me profile CRUD + change password (PRD F2/F3)."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_roles
from app.core.enums import Role
from app.core.security import hash_password, verify_password
from app.db import get_db
from app.models import PatientProfile, TherapistProfile, User
from app.schemas.user import (
    ChangePasswordRequest,
    MeOut,
    PatientProfileIn,
    PatientProfileOut,
    TherapistProfileIn,
    TherapistProfileOut,
    UserBase,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])


async def _get_or_create_patient_profile(
    db: AsyncSession, user: User
) -> PatientProfile:
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = PatientProfile(user_id=user.id)
        db.add(profile)
        await db.flush()
    return profile


async def _get_or_create_therapist_profile(
    db: AsyncSession, user: User
) -> TherapistProfile:
    result = await db.execute(
        select(TherapistProfile).where(TherapistProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = TherapistProfile(user_id=user.id, status="pending")
        db.add(profile)
        await db.flush()
    return profile


@router.get("/me", response_model=MeOut)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeOut:
    """当前用户信息 + 角色档案。"""
    me = MeOut(user=UserBase.model_validate(current_user))
    if current_user.role == Role.PATIENT.value:
        result = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            me.patient_profile = PatientProfileOut.model_validate(profile)
    elif current_user.role == Role.THERAPIST.value:
        result = await db.execute(
            select(TherapistProfile).where(TherapistProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            me.therapist_profile = TherapistProfileOut.model_validate(profile)
    return me


@router.patch("/me", response_model=UserBase)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """更新本人基础信息（姓名/手机号/邮箱）。"""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        exists = await db.execute(select(User).where(User.phone == payload.phone))
        other = exists.scalar_one_or_none()
        if other and other.id != current_user.id:
            raise HTTPException(status_code=409, detail="该手机号已被占用")
        current_user.phone = payload.phone
    if payload.email is not None:
        exists = await db.execute(
            select(User).where(User.email == payload.email.lower())
        )
        other = exists.scalar_one_or_none()
        if other and other.id != current_user.id:
            raise HTTPException(status_code=409, detail="该邮箱已被占用")
        current_user.email = payload.email.lower()
    await db.flush()
    return current_user


@router.post("/me/change-password", status_code=204)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """修改密码（需验证旧密码）。"""
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="旧密码不正确")
    current_user.password_hash = hash_password(payload.new_password)
    await db.flush()


# ---------- Patient profile (self) ----------
@router.get("/me/patient-profile", response_model=PatientProfileOut)
async def get_my_patient_profile(
    current_user: User = Depends(require_roles(Role.PATIENT)),
    db: AsyncSession = Depends(get_db),
) -> PatientProfile:
    profile = await _get_or_create_patient_profile(db, current_user)
    return profile


@router.put("/me/patient-profile", response_model=PatientProfileOut)
async def upsert_my_patient_profile(
    payload: PatientProfileIn,
    current_user: User = Depends(require_roles(Role.PATIENT)),
    db: AsyncSession = Depends(get_db),
) -> PatientProfile:
    """创建/更新本人患者档案（PRD F2.1）。"""
    profile = await _get_or_create_patient_profile(db, current_user)
    data = payload.model_dump(exclude_unset=True)
    if data.get("birth_date") is not None:
        data["birth_date"] = date.fromisoformat(data["birth_date"])
    for key, value in data.items():
        setattr(profile, key, value)
    await db.flush()
    return profile


# ---------- Therapist profile (self) ----------
@router.get("/me/therapist-profile", response_model=TherapistProfileOut)
async def get_my_therapist_profile(
    current_user: User = Depends(require_roles(Role.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> TherapistProfile:
    profile = await _get_or_create_therapist_profile(db, current_user)
    return profile


@router.put("/me/therapist-profile", response_model=TherapistProfileOut)
async def upsert_my_therapist_profile(
    payload: TherapistProfileIn,
    current_user: User = Depends(require_roles(Role.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> TherapistProfile:
    """创建/更新本人康复师档案（PRD F3.1）。资质修改后需重新审核。"""
    profile = await _get_or_create_therapist_profile(db, current_user)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(profile, key, value)
    # any qualification-relevant change resets status to pending review
    if any(k in data for k in ("organization", "license_type", "license_number", "license_docs")):
        profile.status = "pending"
        profile.review_note = None
        profile.reviewed_by = None
        profile.reviewed_at = None
    await db.flush()
    return profile
