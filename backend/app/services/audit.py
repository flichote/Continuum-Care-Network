"""Audit logging service."""
import json
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


async def log_action(
    db: AsyncSession,
    actor_id: Optional[UUID],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    detail: Optional[dict[str, Any]] = None,
    ip: Optional[str] = None,
) -> None:
    """Append an audit log row (admin/security-relevant actions only)."""
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            detail=json.dumps(detail, ensure_ascii=False, default=str) if detail else None,
            ip=ip,
        )
    )
