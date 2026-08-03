"""Alert endpoints: list & handle (PRD F8)."""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import ensure_patient_access, get_current_user, require_roles
from app.core.enums import Role
from app.db import get_db
from app.models import Alert, User
from app.schemas.api import AlertHandleIn, AlertOut
from app.services.audit import log_action

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    patient_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Alert]:
    """告警列表：患者本人 / 绑定康复师 / 管理员全局（F8.5）。"""
    target = patient_id or current_user.id
    await ensure_patient_access(db, target, current_user)

    filters = [Alert.patient_id == target]
    if status_filter:
        filters.append(Alert.status == status_filter)
    if severity:
        filters.append(Alert.severity == severity)
    stmt = (
        select(Alert)
        .where(*filters)
        .order_by(Alert.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    return (await db.execute(stmt)).scalars().all()


@router.patch("/{alert_id}/handle", response_model=AlertOut)
async def handle_alert(
    alert_id: UUID,
    payload: AlertHandleIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Alert:
    """康复师标记告警已处理/已联系（F8.4）；管理员可代处理。"""
    alert = await db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="告警不存在")
    if current_user.role == Role.PATIENT.value:
        raise HTTPException(status_code=403, detail="患者不可处理告警")
    if current_user.role == Role.THERAPIST.value:
        await ensure_patient_access(db, alert.patient_id, current_user)

    alert.status = "handled"
    alert.handled_by = current_user.id
    alert.handled_at = datetime.now(timezone.utc)
    if payload.note is not None:
        alert.handler_note = payload.note
    await log_action(
        db, current_user.id, "alert.handle", "alert", alert.id,
        {"patient_id": str(alert.patient_id)},
    )
    return alert
