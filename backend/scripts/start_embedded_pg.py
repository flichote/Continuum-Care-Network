"""Start an embedded PostgreSQL instance for local development (no Docker).

Uses the `pgserver` package (downloads prebuilt PostgreSQL binaries on first
run). The database `continuum_care` is created and the connection URL is
printed for use as DATABASE_URL. The server keeps running after this script
exits (cleanup_mode=None).

Usage:
    python scripts/start_embedded_pg.py
"""
import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

DB_NAME = "continuum_care"
DATA_DIR = Path(__file__).resolve().parents[2] / "pgdata-embedded"


async def _ensure_database(dsn: str, db_name: str) -> None:
    import asyncpg

    conn = await asyncpg.connect(dsn)
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            print(f"[start_embedded_pg] 已创建数据库 {db_name}")
        else:
            print(f"[start_embedded_pg] 数据库 {db_name} 已存在")
    finally:
        await conn.close()


def main() -> None:
    try:
        from pgserver import get_server
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(
            "pgserver 未安装，请先执行: pip install -r requirements-dev.txt"
        ) from exc

    print(f"[start_embedded_pg] PostgreSQL 数据目录: {DATA_DIR}")
    print("[start_embedded_pg] 正在启动（首次运行需下载二进制，可能较慢）...")
    server = get_server(pgdata=str(DATA_DIR), cleanup_mode=None)
    uri = server.get_uri()  # e.g. postgresql://postgres@127.0.0.1:PORT/postgres
    print(f"[start_embedded_pg] 服务已启动: {uri}")

    asyncio.run(_ensure_database(uri, DB_NAME))

    # swap only the database path component (uri = postgresql://user@host:port/postgres)
    base, _sep, _old_db = uri.rpartition("/")
    dsn = f"{base}/{DB_NAME}"
    asyncpg_dsn = dsn.replace("postgresql://", "postgresql+asyncpg://")
    print(f"[start_embedded_pg] 连接串（写入 .env 的 DATABASE_URL）:")
    print(f"    {asyncpg_dsn}")
    print("[start_embedded_pg] 服务保持运行中。如需停止，删除数据目录后重启或手动 kill postgres 进程。")


if __name__ == "__main__":
    main()
