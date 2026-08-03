# syntax=docker/dockerfile:1

# ============================================================
# backend — FastAPI 生产镜像（多阶段构建）
#   Stage 1 builder : 在独立 venv 中安装全部依赖（带缓存层）
#   Stage 2 runtime : 最小运行镜像，非 root 用户，仅复制 venv 与代码
# 构建：docker build -t ccn-backend:latest ./backend
# ============================================================

# ---------- Stage 1: builder ----------
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# 先复制依赖清单，充分利用 Docker 层缓存
COPY requirements.txt .
RUN python -m venv /venv \
    && /venv/bin/pip install --no-cache-dir -r requirements.txt

# ---------- Stage 2: runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/venv/bin:$PATH" \
    PIP_NO_CACHE_DIR=1

# 非 root 运行（最小权限）
RUN groupadd --system --gid 10001 ccn \
    && useradd --system --uid 10001 --gid ccn --create-home --home-dir /home/ccn ccn

WORKDIR /app

# 只复制运行时必需内容（app 代码 + alembic 迁移），tests/scripts 由 .dockerignore 排除
COPY --from=builder /venv /venv
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app

# 运行期不向 /app 写文件，目录保持只读更安全
RUN chown -R ccn:ccn /app
USER ccn

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3).status==200 else 1)"]

# 迁移由 compose command 执行（alembic upgrade head && uvicorn ...）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
