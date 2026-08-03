"""Application settings loaded from environment / .env via pydantic-settings."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> parents: [0]=core, [1]=app, [2]=backend, [3]=repo root
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_REPO_DIR = _BACKEND_DIR.parent

_env_files = tuple(
    p
    for p in (_REPO_DIR / ".env", _BACKEND_DIR / ".env", _BACKEND_DIR / ".env.local")
    if p.exists()
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files or None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App ---
    PROJECT_NAME: str = "Continuum Care Network API"
    API_V1_PREFIX: str = "/api/v1"
    ENV: str = "development"

    # --- Database ---
    DATABASE_URL: str = (
        "postgresql+asyncpg://ccn:ccn_password@localhost:5432/continuum_care"
    )

    # --- JWT ---
    JWT_SECRET: str = "dev-only-secret-change-me-0123456789abcdef"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000"

    # --- Seed admin (created on startup if missing) ---
    SEED_ADMIN_PHONE: str = "13800000000"
    SEED_ADMIN_PASSWORD: str = "Admin123456"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
