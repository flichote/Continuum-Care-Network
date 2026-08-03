"""Admin endpoints: user mgmt, therapist review, match review, thresholds, stats, audit (PRD F9)."""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.core.enums import (
    DEFAULT_ALERT_RULES,
    MatchStatus,
    Role,
    TherapistStatus,
)
from app.db import get_db
from app.models import (
    Alert,
    AuditLog,
    HealthRecord,
    Match,
    Message,
    PlanCheckin,
    RehabPlan,
    ThresholdRule,
    User,
)
from app.schemas.api import (
    AdminUserReview,
    StatisticsOut,
    ThresholdIn,
    ThresholdOut,
)
from app.schemas.user import UserBase
from app.services.audit import log_action

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserBase])
async def list_users(
    role: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="姓名/手机号/邮箱模糊搜索"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    _: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    """用户列表（F9.4）。"""
    filters = []
    if role:
        filters.append(User.role == role)
    if q:
        filters.append(
            (User.full_name.ilike(f"%{q}%"))
            | (User.phone.ilike(f"%{q}%"))
            | (User.email.ilike(f"%{q}%"))
        )
    stmt = (
        select(User)
        .where(*filters)
        .order_by(User.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    return (await db.execute(stmt)).scalars().all()


@router.patch("/users/{user_id}/status", response_model=UserBase)
async def set_user_status(
    user_id: UUID,
    is_active: bool,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> User:
    """停用/启用账号（F9.4）。"""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能停用自己的账号")
    user.is_active = is_active
    await log_action(
        db, current_user.id, "admin.user_status", "user", user.id,
        {"is_active": is_active},
    )
    return user


# ---------- Therapist review (F9.1) ----------
@router.get("/therapists", response_model=list[dict])
async def list_therapists(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    _: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """待审核/已审核的康复师资质列表。"""
    from app.models import TherapistProfile

    filters = []
    if status_filter:
        filters.append(TherapistProfile.status == status_filter)
    stmt = (
        select(User, TherapistProfile)
        .join(TherapistProfile, TherapistProfile.user_id == User.id)
        .where(*filters)
        .order_by(TherapistProfile.created_at.asc())
        .offset((page - 1) * size)
        .limit(size)
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "user_id": str(user.id),
            "full_name": user.full_name,
            "phone": user.phone,
            "email": user.email,
            "organization": profile.organization,
            "license_type": profile.license_type,
            "license_number": profile.license_number,
            "specialties": profile.specialties,
            "bio": profile.bio,
            "status": profile.status,
            "review_note": profile.review_note,
            "created_at": profile.created_at.isoformat(),
        }
        for user, profile in rows
    ]


@router.post("/therapists/{user_id}/review", response_model=dict)
async def review_therapist(
    user_id: UUID,
    payload: AdminUserReview,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """审核康复师资质：通过/驳回（驳回需原因）。"""
    from app.models import TherapistProfile

    user = await db.get(User, user_id)
    if user is None or user.role != Role.THERAPIST.value:
        raise HTTPException(status_code=404, detail="康复师不存在")
    profile = (
        await db.execute(
            select(TherapistProfile).where(TherapistProfile.user_id == user_id)
        )
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="康复师档案不存在")
    if not payload.approve and not payload.note:
        raise HTTPException(status_code=422, detail="驳回必须填写原因")

    profile.status = (
        TherapistStatus.APPROVED.value
        if payload.approve
        else TherapistStatus.REJECTED.value
    )
    profile.review_note = payload.note
    profile.reviewed_by = current_user.id
    profile.reviewed_at = datetime.now(timezone.utc)
    await log_action(
        db, current_user.id, "admin.therapist_review", "therapist", user_id,
        {"approve": payload.approve, "note": payload.note},
    )
    return {
        "user_id": str(user_id),
        "status": profile.status,
        "review_note": profile.review_note,
        "reviewed_at": profile.reviewed_at.isoformat(),
    }


# ---------- Match review (F9.2) ----------
@router.get("/matches", response_model=list[dict])
async def list_matches(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    _: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    filters = []
    if status_filter:
        filters.append(Match.status == status_filter)
    stmt = (
        select(Match)
        .where(*filters)
        .order_by(Match.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    matches = (await db.execute(stmt)).scalars().all()
    out = []
    for m in matches:
        patient = await db.get(User, m.patient_id)
        therapist = await db.get(User, m.therapist_id)
        out.append(
            {
                "id": str(m.id),
                "patient_id": str(m.patient_id),
                "patient_name": patient.full_name if patient else None,
                "therapist_id": str(m.therapist_id),
                "therapist_name": therapist.full_name if therapist else None,
                "status": m.status,
                "requested_by": m.requested_by,
                "request_note": m.request_note,
                "review_note": m.review_note,
                "created_at": m.created_at.isoformat(),
            }
        )
    return out


@router.post("/matches/{match_id}/review", response_model=dict)
async def review_match(
    match_id: UUID,
    payload: AdminUserReview,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """审核绑定/解绑申请（F9.2）。批准绑定前校验患者无生效绑定。"""
    match = await db.get(Match, match_id)
    if match is None:
        raise HTTPException(status_code=404, detail="绑定关系不存在")
    if not payload.approve and not payload.note:
        raise HTTPException(status_code=422, detail="驳回必须填写原因")

    if payload.approve and match.status == MatchStatus.PENDING.value:
        existing = (
            await db.execute(
                select(Match.id).where(
                    Match.patient_id == match.patient_id,
                    Match.status == MatchStatus.APPROVED.value,
                    Match.id != match.id,
                )
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="该患者已有生效绑定关系")

    if payload.approve and match.status == MatchStatus.PENDING_UNBIND.value:
        match.status = MatchStatus.TERMINATED.value
    elif payload.approve:
        match.status = MatchStatus.APPROVED.value
    else:
        # reject returns to previous effective state
        match.status = (
            MatchStatus.TERMINATED.value
            if match.status == MatchStatus.PENDING_UNBIND.value
            else MatchStatus.REJECTED.value
        )
    match.reviewed_by = current_user.id
    match.reviewed_at = datetime.now(timezone.utc)
    match.review_note = payload.note
    await log_action(
        db, current_user.id, "admin.match_review", "match", match.id,
        {"approve": payload.approve, "status": match.status},
    )
    return {
        "id": str(match.id),
        "status": match.status,
        "review_note": match.review_note,
        "reviewed_at": match.reviewed_at.isoformat(),
    }


# ---------- Threshold config (F9.3) ----------
@router.get("/thresholds", response_model=list[ThresholdOut])
async def list_thresholds(
    _: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[ThresholdOut]:
    """阈值规则列表（含内置默认规则）。"""
    rows = (await db.execute(select(ThresholdRule))).scalars().all()
    db_map = {r.key: r for r in rows}
    out: list[ThresholdOut] = []
    for key, (value, severity, message) in DEFAULT_ALERT_RULES.items():
        rule = db_map.get(key)
        if rule is not None:
            out.append(ThresholdOut.model_validate(rule))
        else:
            metric, direction = key.split(":")
            out.append(
                ThresholdOut(
                    key=key, metric=metric, direction=direction,
                    value=value, severity=severity, message=message,
                )
            )
    # any extra DB-only rules
    for key, rule in db_map.items():
        if key not in DEFAULT_ALERT_RULES:
            out.append(ThresholdOut.model_validate(rule))
    return out


@router.put("/thresholds/{key}", response_model=ThresholdOut)
async def upsert_threshold(
    key: str,
    payload: ThresholdIn,
    current_user: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> ThresholdOut:
    """新增/更新阈值规则（key 形如 systolic:gt）。"""
    if payload.key != key:
        raise HTTPException(status_code=422, detail="路径 key 与请求体不一致")
    rule = (
        await db.execute(select(ThresholdRule).where(ThresholdRule.key == key))
    ).scalar_one_or_none()
    if rule is None:
        rule = ThresholdRule(key=key, metric=payload.metric, direction=payload.direction)
        db.add(rule)
    rule.value = payload.value
    rule.severity = payload.severity
    rule.message = payload.message
    await log_action(
        db, current_user.id, "admin.threshold_upsert", "threshold", key,
        {"value": payload.value, "severity": payload.severity},
    )
    return rule


@router.delete("/thresholds/{key}", status_code=204)
async def delete_threshold(
    key: str,
    _: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> None:
    """删除自定义阈值规则（恢复为内置默认）。"""
    rule = (
        await db.execute(select(ThresholdRule).where(ThresholdRule.key == key))
    ).scalar_one_or_none()
    if rule is not None:
        await db.delete(rule)


# ---------- Statistics (F9 看板) ----------
@router.get("/statistics", response_model=StatisticsOut)
async def statistics(
    _: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> StatisticsOut:
    """平台统计看板。"""
    async def count(model, *filters) -> int:
        return (
            await db.execute(select(func.count()).select_from(model).where(*filters))
        ).scalar_one()

    users_by_role = {
        role: await count(User, User.role == role)
        for role in ("patient", "therapist", "admin")
    }
    matches_by_status = {
        s: await count(Match, Match.status == s)
        for s in ("pending", "approved", "rejected", "pending_unbind", "terminated")
    }
    alerts_by_status = {
        s: await count(Alert, Alert.status == s)
        for s in ("open", "handled")
    }
    return StatisticsOut(
        users=users_by_role,
        matches=matches_by_status,
        health_records=await count(HealthRecord),
        alerts=alerts_by_status,
        messages=await count(Message),
        plans=await count(RehabPlan),
    )


# ---------- Audit logs (F9.5) ----------
@router.get("/audit-logs", response_model=list[dict])
async def list_audit_logs(
    action: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    _: User = Depends(require_roles(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """审计日志（登录、审核、绑定变更等）。"""
    filters = []
    if action:
        filters.append(AuditLog.action == action)
    stmt = (
        select(AuditLog)
        .where(*filters)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    logs = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(log.id),
            "actor_id": str(log.actor_id) if log.actor_id else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "detail": log.detail,
            "ip": log.ip,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
