"""Auth / token / user schemas."""
import re
from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

RoleLiteral = Literal["patient", "therapist"]


def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("密码长度至少 8 位")
    if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
        raise ValueError("密码必须同时包含字母和数字")
    return v


class RegisterRequest(BaseModel):
    phone: Optional[str] = Field(
        None, pattern=r"^1\d{10}$", description="中国大陆手机号（与 email 二选一）"
    )
    email: Optional[EmailStr] = None
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=100)
    role: RoleLiteral = Field(description="patient / therapist")

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator("phone")
    @classmethod
    def _phone_or_email(cls, v: Optional[str], info):
        # ensure at least one of phone/email is provided
        return v


class LoginRequest(BaseModel):
    account: str = Field(description="手机号或邮箱")
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="access token 有效期（秒）")


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class UserBase(BaseModel):
    id: UUID
    phone: Optional[str] = None
    email: Optional[str] = None
    role: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^1\d{10}$")
    email: Optional[EmailStr] = None


class PatientProfileIn(BaseModel):
    gender: Optional[Literal["male", "female", "other"]] = None
    birth_date: Optional[str] = None  # ISO date
    contact_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_history: Optional[str] = None
    discharge_summary: Optional[str] = None
    allergies: Optional[str] = None


class PatientProfileOut(BaseModel):
    id: UUID
    user_id: UUID
    gender: Optional[str] = None
    birth_date: Optional[date] = None
    contact_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_history: Optional[str] = None
    discharge_summary: Optional[str] = None
    allergies: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientProfileTherapistView(BaseModel):
    """View for a bound therapist: sensitive fields (emergency contact) omitted (PRD F2.4)."""
    id: UUID
    user_id: UUID
    gender: Optional[str] = None
    birth_date: Optional[date] = None
    contact_phone: Optional[str] = None
    medical_history: Optional[str] = None
    discharge_summary: Optional[str] = None
    allergies: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TherapistProfileIn(BaseModel):
    organization: Optional[str] = Field(None, max_length=200)
    license_type: Optional[str] = Field(None, max_length=100)
    license_number: Optional[str] = Field(None, max_length=100)
    license_docs: Optional[str] = None
    specialties: Optional[str] = None
    bio: Optional[str] = None


class TherapistProfileOut(BaseModel):
    id: UUID
    user_id: UUID
    organization: Optional[str] = None
    license_type: Optional[str] = None
    license_number: Optional[str] = None
    license_docs: Optional[str] = None
    specialties: Optional[str] = None
    bio: Optional[str] = None
    status: str
    review_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TherapistPublicOut(BaseModel):
    """Public therapist card for patients to browse (PRD F3.3)."""
    id: UUID
    user_id: UUID
    full_name: str
    organization: Optional[str] = None
    license_type: Optional[str] = None
    specialties: Optional[str] = None
    bio: Optional[str] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class MeOut(BaseModel):
    user: UserBase
    patient_profile: Optional[PatientProfileOut] = None
    therapist_profile: Optional[TherapistProfileOut] = None
