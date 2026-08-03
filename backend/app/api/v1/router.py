"""API v1 router aggregation."""
from fastapi import APIRouter

from app.api.v1 import (
    admin,
    alerts,
    auth,
    health,
    matching,
    messages,
    patients,
    plans,
    therapists,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(patients.router)
api_router.include_router(therapists.router)
api_router.include_router(matching.router)
api_router.include_router(health.router)
api_router.include_router(plans.router)
api_router.include_router(messages.router)
api_router.include_router(alerts.router)
api_router.include_router(admin.router)
