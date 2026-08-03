"""Shared enums / constants (stored as strings in DB for portability)."""
from enum import Enum


class Role(str, Enum):
    PATIENT = "patient"
    THERAPIST = "therapist"
    ADMIN = "admin"


class TherapistStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class MatchStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING_UNBIND = "pending_unbind"
    TERMINATED = "terminated"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    OPEN = "open"
    HANDLED = "handled"


class PlanStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


# Health metric definitions: name -> (unit, allowed value range)
HEALTH_METRICS: dict[str, dict] = {
    "blood_pressure": {"unit": "mmHg", "fields": ("systolic", "diastolic")},
    "heart_rate": {"unit": "bpm", "fields": ("value",)},
    "temperature": {"unit": "°C", "fields": ("value",)},
    "spo2": {"unit": "%", "fields": ("value",)},
    "blood_glucose": {"unit": "mmol/L", "fields": ("value",)},
    "weight": {"unit": "kg", "fields": ("value",)},
}

# Hard validation ranges (server rejects out-of-range input, PRD F5.4)
HEALTH_VALIDATION: dict[str, dict] = {
    "blood_pressure": {"systolic": (40.0, 250.0), "diastolic": (20.0, 200.0)},
    "heart_rate": {"value": (20.0, 250.0)},
    "temperature": {"value": (30.0, 45.0)},
    "spo2": {"value": (50.0, 100.0)},
    "blood_glucose": {"value": (0.5, 40.0)},
    "weight": {"value": (0.5, 400.0)},
}

# Default alert threshold rules: "<metric>:<direction>" -> (value, severity, message)
DEFAULT_ALERT_RULES: dict[str, tuple[float, str, str]] = {
    "systolic:lt": (90.0, "warning", "收缩压偏低"),
    "systolic:gt": (180.0, "critical", "收缩压过高"),
    "diastolic:lt": (60.0, "warning", "舒张压偏低"),
    "diastolic:gt": (120.0, "critical", "舒张压过高"),
    "spo2:lt": (90.0, "critical", "血氧饱和度偏低"),
    "heart_rate:lt": (50.0, "warning", "心率偏低"),
    "heart_rate:gt": (120.0, "warning", "心率偏高"),
    "temperature:lt": (35.5, "warning", "体温偏低"),
    "temperature:gt": (39.0, "warning", "体温偏高"),
    "blood_glucose:lt": (3.9, "warning", "血糖偏低"),
    "blood_glucose:gt": (11.1, "warning", "血糖偏高"),
}
