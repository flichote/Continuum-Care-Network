"""Rehab plan endpoints: create/view/adjust/check-in/progress (PRD F6)."""
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    ensure_patient_access,
    get_approved_match,
    get_current_user,
    require_roles,
)
from app.core.enums import Role
from app.db import get_db
from app.models import PlanCheckin, PlanTask, RehabPlan, User
from app.schemas.api import (
    CheckinIn,
    CheckinOut,
    PlanCreate,
    PlanOut,
    PlanProgressOut,
    PlanTaskIn,
    PlanTaskOut,
    PlanUpdate,
)
from app.services.audit import log_action

router = APIRouter(prefix="/plans", tags=["plans"])


async def _load_plan_with_tasks(db: AsyncSession, plan_id: UUID) -> RehabPlan | None:
    plan = await db.get(RehabPlan, plan_id)
    if plan is None:
        return None
    tasks = (
        await db.execute(
            select(PlanTask)
            .where(PlanTask.plan_id == plan_id)
            .order_by(PlanTask.order_index, PlanTask.created_at)
        )
    ).scalars().all()
    plan._tasks = tasks  # type: ignore[attr-defined]
    return plan


def _plan_out(plan: RehabPlan) -> PlanOut:
    return PlanOut(
        id=plan.id,
        patient_id=plan.patient_id,
        therapist_id=plan.therapist_id,
        title=plan.title,
        goal=plan.goal,
        start_date=plan.start_date,
        end_date=plan.end_date,
        status=plan.status,
        tasks=[PlanTaskOut.model_validate(t) for t in getattr(plan, "_tasks", [])],
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.post("", response_model=PlanOut, status_code=201)
async def create_plan(
    payload: PlanCreate,
    current_user: User = Depends(require_roles(Role.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> PlanOut:
    """康复师为名下患者创建康复计划（F6.1）。"""
    match = await get_approved_match(db, payload.patient_id, current_user.id)
    if match is None:
        raise HTTPException(status_code=403, detail="只能为已绑定患者制定计划")

    plan = RehabPlan(
        patient_id=payload.patient_id,
        therapist_id=current_user.id,
        title=payload.title,
        goal=payload.goal,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(plan)
    await db.flush()
    for idx, task_in in enumerate(payload.tasks):
        db.add(
            PlanTask(
                plan_id=plan.id,
                title=task_in.title,
                description=task_in.description,
                frequency=task_in.frequency,
                duration_minutes=task_in.duration_minutes,
                order_index=task_in.order_index if task_in.order_index is not None else idx,
            )
        )
    await db.flush()
    await log_action(
        db, current_user.id, "plan.create", "rehab_plan", plan.id,
        {"patient_id": str(payload.patient_id)},
    )
    plan = await _load_plan_with_tasks(db, plan.id)
    return _plan_out(plan)


@router.get("", response_model=list[PlanOut])
async def list_plans(
    patient_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PlanOut]:
    """患者查看本人计划；康复师查看名下患者计划。"""
    if current_user.role == Role.PATIENT.value:
        stmt = select(RehabPlan).where(RehabPlan.patient_id == current_user.id)
    elif current_user.role == Role.THERAPIST.value:
        if patient_id is None:
            raise HTTPException(status_code=422, detail="康复师查询需指定 patient_id")
        match = await get_approved_match(db, patient_id, current_user.id)
        if match is None:
            raise HTTPException(status_code=403, detail="只能查看名下患者的计划")
        stmt = select(RehabPlan).where(
            RehabPlan.patient_id == patient_id,
            RehabPlan.therapist_id == current_user.id,
        )
    else:
        raise HTTPException(status_code=403, detail="无权限")

    plans = (await db.execute(stmt.order_by(RehabPlan.created_at.desc()))).scalars().all()
    out: list[PlanOut] = []
    for plan in plans:
        plan = await _load_plan_with_tasks(db, plan.id)
        out.append(_plan_out(plan))
    return out


@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(
    plan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlanOut:
    plan = await _load_plan_with_tasks(db, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="计划不存在")
    if current_user.role == Role.PATIENT.value and plan.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能查看本人计划")
    if current_user.role == Role.THERAPIST.value and plan.therapist_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能查看自己制定的计划")
    if current_user.role == Role.ADMIN.value:
        raise HTTPException(status_code=403, detail="管理员不查看计划详情")
    return _plan_out(plan)


@router.patch("/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: UUID,
    payload: PlanUpdate,
    current_user: User = Depends(require_roles(Role.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> PlanOut:
    """康复师调整计划（F6.5）。"""
    plan = await db.get(RehabPlan, plan_id)
    if plan is None or plan.therapist_id != current_user.id:
        raise HTTPException(status_code=404, detail="计划不存在或不属于你")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(plan, key, value)
    await db.flush()
    await log_action(db, current_user.id, "plan.update", "rehab_plan", plan.id)
    plan = await _load_plan_with_tasks(db, plan.id)
    return _plan_out(plan)


@router.post("/{plan_id}/tasks", response_model=PlanTaskOut, status_code=201)
async def add_task(
    plan_id: UUID,
    payload: PlanTaskIn,
    current_user: User = Depends(require_roles(Role.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> PlanTask:
    plan = await db.get(RehabPlan, plan_id)
    if plan is None or plan.therapist_id != current_user.id:
        raise HTTPException(status_code=404, detail="计划不存在或不属于你")
    max_order = (
        await db.execute(select(func.max(PlanTask.order_index)).where(PlanTask.plan_id == plan_id))
    ).scalar_one()
    task = PlanTask(
        plan_id=plan_id,
        title=payload.title,
        description=payload.description,
        frequency=payload.frequency,
        duration_minutes=payload.duration_minutes,
        order_index=payload.order_index if payload.order_index is not None else (max_order or 0) + 1,
    )
    db.add(task)
    await db.flush()
    return task


@router.patch("/tasks/{task_id}", response_model=PlanTaskOut)
async def update_task(
    task_id: UUID,
    payload: PlanTaskIn,
    current_user: User = Depends(require_roles(Role.THERAPIST)),
    db: AsyncSession = Depends(get_db),
) -> PlanTask:
    task = await db.get(PlanTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    plan = await db.get(RehabPlan, task.plan_id)
    if plan is None or plan.therapist_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能调整自己计划的任务")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(task, key, value)
    await db.flush()
    return task


@router.post("/tasks/{task_id}/checkin", response_model=CheckinOut, status_code=201)
async def checkin_task(
    task_id: UUID,
    payload: CheckinIn,
    current_user: User = Depends(require_roles(Role.PATIENT)),
    db: AsyncSession = Depends(get_db),
) -> PlanCheckin:
    """患者执行打卡（F6.3）；同一任务同一天重复打卡为幂等更新。"""
    task = await db.get(PlanTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    plan = await db.get(RehabPlan, task.plan_id)
    if plan is None or plan.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能给本人计划的任务打卡")

    checkin_date = payload.checkin_date or date.today()
    existing = (
        await db.execute(
            select(PlanCheckin).where(
                PlanCheckin.task_id == task_id,
                PlanCheckin.patient_id == current_user.id,
                PlanCheckin.checkin_date == checkin_date,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        existing.completed = payload.completed
        if payload.note is not None:
            existing.note = payload.note
        return existing

    checkin = PlanCheckin(
        task_id=task_id,
        patient_id=current_user.id,
        checkin_date=checkin_date,
        completed=payload.completed,
        note=payload.note,
    )
    db.add(checkin)
    await db.flush()
    return checkin


@router.get("/{plan_id}/progress", response_model=PlanProgressOut)
async def get_plan_progress(
    plan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlanProgressOut:
    """计划执行进度（完成率 + 打卡记录），患者本人与制定康复师可见（F6.4）。"""
    plan = await db.get(RehabPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="计划不存在")
    if current_user.role == Role.PATIENT.value and plan.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能查看本人计划进度")
    if current_user.role == Role.THERAPIST.value and plan.therapist_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能查看自己计划的进度")
    if current_user.role == Role.ADMIN.value:
        raise HTTPException(status_code=403, detail="无权限")

    tasks = (
        await db.execute(
            select(PlanTask).where(PlanTask.plan_id == plan_id)
        )
    ).scalars().all()
    task_ids = [t.id for t in tasks]
    checkins: list[PlanCheckin] = []
    if task_ids:
        checkins = (
            await db.execute(
                select(PlanCheckin)
                .where(PlanCheckin.task_id.in_(task_ids), PlanCheckin.completed.is_(True))
                .order_by(PlanCheckin.checkin_date.desc())
            )
        ).scalars().all()

    completed_task_ids = {c.task_id for c in checkins}
    total_tasks = len(tasks)
    completed_tasks = len(completed_task_ids) if total_tasks else 0
    rate = round(completed_tasks / total_tasks * 100, 1) if total_tasks else 0.0
    return PlanProgressOut(
        plan_id=plan_id,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_rate=rate,
        checkins=[CheckinOut.model_validate(c) for c in checkins],
    )
