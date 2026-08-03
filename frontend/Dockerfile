# syntax=docker/dockerfile:1

# ============================================================
# frontend — Next.js 16 生产镜像（多阶段 + standalone 输出）
#   Stage 1 deps    : npm ci 安装锁文件依赖（独立缓存层）
#   Stage 2 builder : next build 生成 .next/standalone 最小产物
#   Stage 3 runner  : 仅包含 standalone 产物 + 静态资源，非 root
# 构建：docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 -t ccn-web:latest ./frontend
# ============================================================

# ---------- Stage 1: deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Stage 3: runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# 非 root 运行（Next.js 官方示例约定 uid/gid 1001）
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# standalone 已包含 server.js 与运行所需 node_modules；
# 静态资源与 public 目录需要单独复制，server.js 会自动伺服
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
