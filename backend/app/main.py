"""FastAPI application entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app import __version__
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.enums import Role
from app.core.security import hash_password
from app.db import async_session_factory, engine
from app.models import Base, User

logger = logging.getLogger("ccn.backend")


async def _seed_admin() -> None:
    """Create the seed admin account on first startup (PRD F1 认证-管理员种子账号)."""
    async with async_session_factory() as db:
        result = await db.execute(
            select(User).where(User.phone == settings.SEED_ADMIN_PHONE)
        )
        if result.scalar_one_or_none() is not None:
            return
        admin = User(
            phone=settings.SEED_ADMIN_PHONE,
            password_hash=hash_password(settings.SEED_ADMIN_PASSWORD),
            role=Role.ADMIN.value,
            full_name="平台管理员",
        )
        db.add(admin)
        await db.commit()
        logger.info("Seeded admin account %s", settings.SEED_ADMIN_PHONE)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENV == "development":
        # dev convenience: create missing tables so `uvicorn` works without
        # running alembic first. Production uses `alembic upgrade head`.
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    await _seed_admin()
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=__version__,
    description="连续照护网络平台后端 API（FastAPI + PostgreSQL）",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/healthz", tags=["system"])
async def healthz() -> dict:
    """存活探针：检查数据库连通性。"""
    db_status = "up"
    try:
        async with engine.connect() as conn:
            await conn.execute(select(1))
    except Exception:  # pragma: no cover - depends on runtime env
        db_status = "down"
    return {
        "status": "ok" if db_status == "up" else "degraded",
        "version": __version__,
        "database": db_status,
    }


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "/healthz",
    }
