"""Patient-facing endpoints for therapists/admin: list & view patient profiles (PRD F2.3/F2.4)."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import ensure_patient_access, get_current_user, require_roles
from app.core.enums import Role
from app.db import get_db
from app.models import Match, PatientProfile, User
from app.schemas.user import PatientProfileOut, PatientProfileTherapistView

router = APIRouter(prefix="/patients", tags=["patients"])


def _mask_sensitive(profile: PatientProfile) -> PatientProfileTherapistView:
    return PatientProfileTherapistView(
        id=profile.id,
        user_id=profile.user_id,
        gender=profile.gender,
        birth_date=profile.birth_date.isoformat() if profile.birth_date else None,
        contact_phone=profile.contact_phone,
        medical_history=profile.medical_history,
        discharge_summary=profile.discharge_summary,
        allergies=profile.allergies,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("", response_model=list[dict])
async def list_patients(
    q: str | None = Query(None, description="按姓名模糊搜索"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """康复师：名下患者列表；管理员：全部患者列表。"""
    if current_user.role == Role.THERAPIST.value:
        match_q = select(Match.patient_id).where(
            Match.therapist_id == current_user.id,
            Match.status == "approved",
        )
        patient_ids = [row[0] for row in (await db.execute(match_q)).all()]
        if not patient_ids:
            return []
        stmt = select(User).where(User.id.in_(patient_ids), User.role == Role.PATIENT.value)
    elif current_user.role == Role.ADMIN.value:
        stmt = select(User).where(User.role == Role.PATIENT.value)
    else:
        raise HTTPException(status_code=403, detail="无权限查看患者列表")

    if q:
        stmt = stmt.where(User.full_name.ilike(f"%{q}%"))
    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
    users = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "phone": u.phone,
            "email": u.email,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.get("/{patient_id}", response_model=PatientProfileOut | PatientProfileTherapistView)
async def get_patient_profile(
    patient_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """查看患者档案。患者本人见全量；绑定康复师见脱敏视图（隐藏紧急联系人，PRD F2.4）；管理员治理场景见全量。"""
    await ensure_patient_access(db, patient_id, current_user)
    patient = await db.get(User, patient_id)
    if patient is None or patient.role != Role.PATIENT.value:
        raise HTTPException(status_code=404, detail="患者不存在")
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == patient_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="患者档案未创建")

    if current_user.role == Role.PATIENT.value or current_user.role == Role.ADMIN.value:
        return profile
    return _mask_sensitive(profile)
