"""Patient-therapist matching endpoints (PRD F4)."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_roles
from app.core.enums import MatchStatus, Role
from app.db import get_db
from app.models import Match, User
from app.schemas.api import MatchOut, MatchRequestIn, UnbindRequest
from app.services.audit import log_action

router = APIRouter(prefix="/matches", tags=["matching"])


async def _has_active_match(db: AsyncSession, patient_id: UUID) -> bool:
    result = await db.execute(
        select(Match.id).where(
            Match.patient_id == patient_id,
            Match.status == MatchStatus.APPROVED.value,
        )
    )
    return result.scalar_one_or_none() is not None


@router.post("/request", response_model=MatchOut, status_code=201)
async def request_match(
    payload: MatchRequestIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Match:
    """患者申请绑定康复师 / 康复师申请绑定患者（F4.2）；管理员可直接建立绑定。"""
    if current_user.role == Role.PATIENT.value:
        if payload.therapist_id is None:
            raise HTTPException(status_code=422, detail="患者申请绑定需提供 therapist_id")
        patient_id, therapist_id = current_user.id, payload.therapist_id
        requested_by = Role.PATIENT.value
    elif current_user.role == Role.THERAPIST.value:
        if payload.patient_id is None:
            raise HTTPException(status_code=422, detail="康复师申请绑定需提供 patient_id")
        patient_id, therapist_id = payload.patient_id, current_user.id
        requested_by = Role.THERAPIST.value
    elif current_user.role == Role.ADMIN.value:
        if payload.patient_id is None or payload.therapist_id is None:
            raise HTTPException(
                status_code=422, detail="管理员绑定需同时提供 patient_id 与 therapist_id"
            )
        patient_id, therapist_id = payload.patient_id, payload.therapist_id
        requested_by = Role.ADMIN.value
    else:
        raise HTTPException(status_code=403, detail="无权限")

    patient = await db.get(User, patient_id)
    therapist = await db.get(User, therapist_id)
    if patient is None or patient.role != Role.PATIENT.value:
        raise HTTPException(status_code=404, detail="患者不存在")
    if therapist is None or therapist.role != Role.THERAPIST.value:
        raise HTTPException(status_code=404, detail="康复师不存在")

    if await _has_active_match(db, patient_id):
        raise HTTPException(status_code=409, detail="该患者已有生效绑定关系")

    # duplicate pending request guard
    dup = await db.execute(
        select(Match.id).where(
            Match.patient_id == patient_id,
            Match.therapist_id == therapist_id,
            Match.status.in_([MatchStatus.PENDING.value, MatchStatus.APPROVED.value]),
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="已存在相同绑定申请")

    match = Match(
        patient_id=patient_id,
        therapist_id=therapist_id,
        status=(
            MatchStatus.APPROVED.value
            if requested_by == Role.ADMIN.value
            else MatchStatus.PENDING.value
        ),
        requested_by=requested_by,
        request_note=payload.note,
        reviewed_by=current_user.id if requested_by == Role.ADMIN.value else None,
        reviewed_at=(
            datetime.now(timezone.utc)
            if requested_by == Role.ADMIN.value
            else None
        ),
    )
    db.add(match)
    await db.flush()
    await log_action(
        db, current_user.id, "match.request", "match", match.id,
        {"patient_id": str(patient_id), "therapist_id": str(therapist_id)},
    )
    return match


@router.get("", response_model=list[MatchOut])
async def list_my_matches(
    status_filter: str | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Match]:
    """查看自己的绑定关系/申请（患者/康复师）；管理员可看全部。"""
    stmt = select(Match)
    if current_user.role != Role.ADMIN.value:
        stmt = stmt.where(
            or_(
                Match.patient_id == current_user.id,
                Match.therapist_id == current_user.id,
            )
        )
    if status_filter:
        stmt = stmt.where(Match.status == status_filter)
    stmt = stmt.order_by(Match.created_at.desc())
    return (await db.execute(stmt)).scalars().all()


@router.get("/{match_id}", response_model=MatchOut)
async def get_match_detail(
    match_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Match:
    match = await db.get(Match, match_id)
    if match is None:
        raise HTTPException(status_code=404, detail="绑定关系不存在")
    if current_user.role != Role.ADMIN.value and (
        current_user.id not in (match.patient_id, match.therapist_id)
    ):
        raise HTTPException(status_code=403, detail="无权查看该绑定关系")
    return match


@router.post("/{match_id}/unbind", response_model=MatchOut)
async def request_unbind(
    match_id: UUID,
    payload: UnbindRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Match:
    """患者/康复师发起解绑申请，管理员审核后生效（F4.3）。"""
    match = await db.get(Match, match_id)
    if match is None:
        raise HTTPException(status_code=404, detail="绑定关系不存在")
    if current_user.id not in (match.patient_id, match.therapist_id):
        raise HTTPException(status_code=403, detail="仅绑定双方可发起解绑")
    if match.status != MatchStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="仅生效中的绑定关系可申请解绑")
    match.status = MatchStatus.PENDING_UNBIND.value
    match.request_note = payload.note
    await log_action(
        db, current_user.id, "match.unbind_request", "match", match.id
    )
    return match
