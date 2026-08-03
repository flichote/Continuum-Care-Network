"""User + patient profile + therapist profile models."""
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, utcnow


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(20), unique=True, nullable=True, index=True
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class PatientProfile(Base, TimestampMixin):
    __tablename__ = "patient_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    gender: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )
    medical_history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    discharge_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    allergies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class TherapistProfile(Base, TimestampMixin):
    __tablename__ = "therapist_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    organization: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )  # 执业机构
    license_type: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # 执业类别
    license_number: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # 资格证书编号
    license_docs: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # 资质证明材料（URL/描述；文件上传 v1.1）
    specialties: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # 擅长方向（逗号分隔）
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 简介
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )  # pending/approved/rejected
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
