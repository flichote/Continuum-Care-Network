"""Alert threshold evaluation service (PRD F8)."""
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import DEFAULT_ALERT_RULES, HEALTH_METRICS
from app.models import Alert, HealthRecord, ThresholdRule


def _metric_values(record: HealthRecord) -> dict[str, float]:
    """Map a record to comparable values keyed by metric name."""
    values: dict[str, float] = {}
    if record.record_type == "blood_pressure":
        if record.systolic is not None:
            values["systolic"] = record.systolic
        if record.diastolic is not None:
            values["diastolic"] = record.diastolic
    elif record.value is not None:
        values[record.record_type] = record.value
    return values


async def evaluate_health_record(
    db: AsyncSession, record: HealthRecord
) -> list[Alert]:
    """Check a health record against threshold rules and create Alert rows.

    Rules come from the threshold_rules table (admin-configurable, PRD F9.3),
    falling back to DEFAULT_ALERT_RULES for keys not present in DB.
    """
    values = _metric_values(record)
    if not values:
        return []

    # Load DB rules (override defaults)
    result = await db.execute(select(ThresholdRule))
    db_rules = {r.key: r for r in result.scalars().all()}

    alerts: list[Alert] = []
    for metric, value in values.items():
        for direction in ("lt", "gt"):
            key = f"{metric}:{direction}"
            rule = db_rules.get(key)
            if rule is not None:
                threshold, severity, message = rule.value, rule.severity, rule.message
            else:
                default = DEFAULT_ALERT_RULES.get(key)
                if default is None:
                    continue
                threshold, severity, message = default

            triggered = value < threshold if direction == "lt" else value > threshold
            if not triggered:
                continue

            alert = Alert(
                patient_id=record.patient_id,
                health_record_id=record.id,
                alert_type=key,
                severity=severity,
                message=f"{message}（{metric}={value:.1f}，阈值 {direction} {threshold}）",
            )
            db.add(alert)
            alerts.append(alert)
    return alerts


async def get_open_alert_count(db: AsyncSession, patient_id: UUID) -> int:
    result = await db.execute(
        select(Alert).where(
            Alert.patient_id == patient_id, Alert.status == "open"
        )
    )
    return len(result.scalars().all())
