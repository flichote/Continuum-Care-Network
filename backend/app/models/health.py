"""Health record, alert threshold rule, and alert models."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, utcnow


class HealthRecord(Base, TimestampMixin):
    __tablename__ = "health_records"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # blood_pressure / heart_rate / temperature / spo2 / blood_glucose / weight
    record_type: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True
    )
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    systolic: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    diastolic: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        # Composite index for time-range queries per patient + metric
        Index(
            "ix_health_records_patient_type_time",
            "patient_id",
            "record_type",
            "recorded_at",
        ),
    )


class ThresholdRule(Base, TimestampMixin):
    """Alert threshold rule, key = '<metric>:<direction>' e.g. systolic:gt.
    Overrides DEFAULT_ALERT_RULES from app.core.enums."""

    __tablename__ = "threshold_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    metric: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String(5), nullable=False)  # gt / lt
    value: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="warning", nullable=False)
    message: Mapped[str] = mapped_column(String(200), nullable=False)


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    health_record_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("health_records.id", ondelete="SET NULL"), nullable=True
    )
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(
        String(20), default="warning", nullable=False, index=True
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="open", nullable=False, index=True
    )  # open / handled
    handled_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    handled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    handler_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
