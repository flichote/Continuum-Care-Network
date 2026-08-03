"""Match / health / plan / message / alert / admin schemas."""
from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------- Match ----------
class MatchRequestIn(BaseModel):
    patient_id: Optional[UUID] = None
    therapist_id: Optional[UUID] = None
    note: Optional[str] = Field(None, max_length=500)


class MatchOut(BaseModel):
    id: UUID
    patient_id: UUID
    therapist_id: UUID
    status: str
    requested_by: str
    request_note: Optional[str] = None
    review_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnbindRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=500)


# ---------- Health ----------
class HealthRecordIn(BaseModel):
    record_type: Literal[
        "blood_pressure", "heart_rate", "temperature", "spo2", "blood_glucose", "weight"
    ]
    value: Optional[float] = None
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    unit: Optional[str] = None
    recorded_at: Optional[datetime] = None
    note: Optional[str] = None


class HealthRecordOut(BaseModel):
    id: UUID
    patient_id: UUID
    record_type: str
    value: Optional[float] = None
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    unit: str
    recorded_at: datetime
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HealthRecordPage(BaseModel):
    total: int
    page: int
    size: int
    items: list[HealthRecordOut]


class TrendPoint(BaseModel):
    date: str
    avg: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    count: int


class TrendOut(BaseModel):
    record_type: str
    field: str
    unit: str
    points: list[TrendPoint]


# ---------- Plans ----------
class PlanTaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    frequency: Optional[str] = Field(None, max_length=100)
    duration_minutes: Optional[int] = Field(None, ge=1, le=1440)
    order_index: Optional[int] = None


class PlanCreate(BaseModel):
    patient_id: UUID
    title: str = Field(min_length=1, max_length=200)
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    tasks: list[PlanTaskIn] = []


class PlanUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[Literal["active", "completed", "archived"]] = None


class PlanTaskOut(BaseModel):
    id: UUID
    plan_id: UUID
    title: str
    description: Optional[str] = None
    frequency: Optional[str] = None
    duration_minutes: Optional[int] = None
    order_index: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlanOut(BaseModel):
    id: UUID
    patient_id: UUID
    therapist_id: UUID
    title: str
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    tasks: list[PlanTaskOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CheckinIn(BaseModel):
    checkin_date: Optional[date] = None
    completed: bool = True
    note: Optional[str] = None


class CheckinOut(BaseModel):
    id: UUID
    task_id: UUID
    patient_id: UUID
    checkin_date: date
    completed: bool
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlanProgressOut(BaseModel):
    plan_id: UUID
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    checkins: list[CheckinOut]


# ---------- Messages ----------
class MessageIn(BaseModel):
    recipient_id: UUID
    content: str = Field(min_length=1, max_length=5000)


class MessageOut(BaseModel):
    id: UUID
    sender_id: UUID
    recipient_id: UUID
    content: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationOut(BaseModel):
    peer_id: UUID
    peer_name: str
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int


class UnreadCountOut(BaseModel):
    unread_count: int


# ---------- Alerts ----------
class AlertOut(BaseModel):
    id: UUID
    patient_id: UUID
    health_record_id: Optional[UUID] = None
    alert_type: str
    severity: str
    message: str
    status: str
    handled_by: Optional[UUID] = None
    handled_at: Optional[datetime] = None
    handler_note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertHandleIn(BaseModel):
    note: Optional[str] = Field(None, max_length=500)


# ---------- Admin ----------
class AdminUserReview(BaseModel):
    approve: bool
    note: Optional[str] = None


class ThresholdOut(BaseModel):
    key: str
    metric: str
    direction: str
    value: float
    severity: str
    message: str

    model_config = ConfigDict(from_attributes=True)


class ThresholdIn(BaseModel):
    key: str = Field(pattern=r"^[a-z_]+:(gt|lt)$")
    metric: str
    direction: Literal["gt", "lt"]
    value: float
    severity: Literal["info", "warning", "critical"]
    message: str = Field(min_length=1, max_length=200)


class StatisticsOut(BaseModel):
    users: dict[str, int]
    matches: dict[str, int]
    health_records: int
    alerts: dict[str, int]
    messages: int
    plans: int
