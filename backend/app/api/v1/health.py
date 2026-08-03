"""Health data endpoints: report, query, trends (PRD F5)."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import ensure_patient_access, get_current_user, require_roles
from app.core.enums import HEALTH_METRICS, HEALTH_VALIDATION, Role
from app.db import get_db
from app.models import HealthRecord, User
from app.schemas.api import (
    HealthRecordIn,
    HealthRecordOut,
    HealthRecordPage,
    TrendOut,
    TrendPoint,
)
from app.services.alerts import evaluate_health_record

router = APIRouter(prefix="/health", tags=["health"])


def _validate_record(payload: HealthRecordIn) -> tuple[dict, str]:
    """Server-side range validation (PRD F5.4). Returns (values, unit)."""
    metric = HEALTH_METRICS[payload.record_type]
    unit = payload.unit or metric["unit"]
    values: dict = {}
    if payload.record_type == "blood_pressure":
        if payload.systolic is None or payload.diastolic is None:
            raise HTTPException(
                status_code=422, detail="血压需同时提供 systolic 与 diastolic"
            )
        bounds = HEALTH_VALIDATION["blood_pressure"]
        for field, value in (("systolic", payload.systolic), ("diastolic", payload.diastolic)):
            lo, hi = bounds[field]
            if not (lo <= value <= hi):
                raise HTTPException(
                    status_code=422,
                    detail=f"{field} 超出合法范围 [{lo}, {hi}]",
                )
        values["systolic"] = payload.systolic
        values["diastolic"] = payload.diastolic
    else:
        if payload.value is None:
            raise HTTPException(
                status_code=422, detail=f"{payload.record_type} 需提供 value"
            )
        lo, hi = HEALTH_VALIDATION[payload.record_type]["value"]
        if not (lo <= payload.value <= hi):
            raise HTTPException(
                status_code=422,
                detail=f"{payload.record_type} 超出合法范围 [{lo}, {hi}]",
            )
        values["value"] = payload.value
    return values, unit


@router.post("/records", response_model=HealthRecordOut, status_code=201)
async def create_health_record(
    payload: HealthRecordIn,
    current_user: User = Depends(require_roles(Role.PATIENT)),
    db: AsyncSession = Depends(get_db),
) -> HealthRecord:
    """患者上报本人健康数据，自动触发异常阈值告警（F5/F8）。"""
    values, unit = _validate_record(payload)
    record = HealthRecord(
        patient_id=current_user.id,
        record_type=payload.record_type,
        unit=unit,
        recorded_at=payload.recorded_at or datetime.now(timezone.utc),
        note=payload.note,
        **values,
    )
    db.add(record)
    await db.flush()
    # Alert evaluation (F8.2): DB rules override defaults
    await evaluate_health_record(db, record)
    return record


@router.get("/records", response_model=HealthRecordPage)
async def list_health_records(
    patient_id: Optional[UUID] = Query(None),
    record_type: Optional[str] = Query(None),
    from_time: Optional[datetime] = Query(None, alias="from"),
    to_time: Optional[datetime] = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HealthRecordPage:
    """查询健康数据：患者本人 / 绑定康复师 / 管理员（F5.5）。"""
    target = patient_id or current_user.id
    await ensure_patient_access(db, target, current_user)

    filters = [HealthRecord.patient_id == target]
    if record_type:
        filters.append(HealthRecord.record_type == record_type)
    if from_time:
        filters.append(HealthRecord.recorded_at >= from_time)
    if to_time:
        filters.append(HealthRecord.recorded_at <= to_time)

    total = (
        await db.execute(
            select(func.count()).select_from(HealthRecord).where(*filters)
        )
    ).scalar_one()
    stmt = (
        select(HealthRecord)
        .where(*filters)
        .order_by(HealthRecord.recorded_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    items = (await db.execute(stmt)).scalars().all()
    return HealthRecordPage(
        total=total, page=page, size=size,
        items=[HealthRecordOut.model_validate(i) for i in items],
    )


@router.get("/records/{record_id}", response_model=HealthRecordOut)
async def get_health_record(
    record_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HealthRecord:
    record = await db.get(HealthRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    await ensure_patient_access(db, record.patient_id, current_user)
    return record


@router.get("/trends", response_model=TrendOut)
async def get_health_trends(
    record_type: str = Query(..., description="指标类型，如 blood_pressure / heart_rate"),
    patient_id: Optional[UUID] = Query(None),
    days: int = Query(7, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TrendOut:
    """按日聚合趋势：avg/min/max/count（F5.3）。"""
    if record_type not in HEALTH_METRICS:
        raise HTTPException(status_code=422, detail="不支持的指标类型")
    target = patient_id or current_user.id
    await ensure_patient_access(db, target, current_user)

    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = select(HealthRecord).where(
        HealthRecord.patient_id == target,
        HealthRecord.record_type == record_type,
        HealthRecord.recorded_at >= since,
    ).order_by(HealthRecord.recorded_at.asc())
    records = (await db.execute(stmt)).scalars().all()

    # field to aggregate: value for single-value metrics, systolic/diastolic for BP
    fields = (
        ("systolic", "diastolic")
        if record_type == "blood_pressure"
        else ("value",)
    )
    buckets: dict[str, dict] = defaultdict(lambda: {"sum": {}, "count": 0, "min": {}, "max": {}})
    for r in records:
        day = r.recorded_at.date().isoformat()
        bucket = buckets[day]
        bucket["count"] += 1
        for f in fields:
            v = getattr(r, f)
            if v is None:
                continue
            bucket["sum"][f] = bucket["sum"].get(f, 0.0) + v
            bucket["min"][f] = v if f not in bucket["min"] else min(bucket["min"][f], v)
            bucket["max"][f] = v if f not in bucket["max"] else max(bucket["max"][f], v)

    unit = HEALTH_METRICS[record_type]["unit"]
    points: list[TrendPoint] = []
    for day in sorted(buckets):
        bucket = buckets[day]
        for f in fields:
            if f not in bucket["sum"]:
                continue
            n = bucket["count"]
            points.append(
                TrendPoint(
                    date=day,
                    avg=round(bucket["sum"][f] / n, 2),
                    min=round(bucket["min"][f], 2),
                    max=round(bucket["max"][f], 2),
                    count=n,
                )
            )
    return TrendOut(
        record_type=record_type,
        field=",".join(fields),
        unit=unit,
        points=points,
    )
