"""Shared pytest fixtures.

Strategy: point DATABASE_URL at a SQLite file BEFORE importing the app, so the
whole application (engine, lifespan, seed admin) runs against SQLite. Tests
therefore exercise the real dependency wiring without needing PostgreSQL.
Production uses PostgreSQL via DATABASE_URL (see app/core/config.py).
"""
import asyncio
import os
import sys
import time
from pathlib import Path

# ensure `app` package is importable regardless of CWD
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = BACKEND_DIR / "test_ccn.db"
os.environ["ENV"] = "development"  # lifespan create_all + seed admin
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH}"
os.environ["JWT_SECRET"] = "test-secret-not-for-production-0123456789abcdef"

import pytest
from fastapi.testclient import TestClient

from app.db import engine
from app.main import app
from app.models import Base


@pytest.fixture(scope="session", autouse=True)
def _prepare_db():
    async def setup():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(setup())
    yield
    asyncio.run(engine.dispose())
    # Windows + aiosqlite: the file handle may still be held briefly after
    # dispose (connections are closed from the TestClient's portal loop, not
    # the main loop). Retry a few times instead of failing the whole run.
    for attempt in range(5):
        try:
            TEST_DB_PATH.unlink(missing_ok=True)
            break
        except PermissionError:
            if attempt == 4:
                break  # leave the file behind; it is gitignored (*.db)
            time.sleep(0.3)


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def unique_phone() -> str:
    import random

    digits = "".join(random.choices("0123456789", k=9))
    return "13" + digits
