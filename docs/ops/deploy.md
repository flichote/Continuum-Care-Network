# Continuum-Care-Network 部署手册（Docker Compose）

> 运维文档 — 适用版本：T6（三服务编排：web / backend / db）
> 配套文件：`docker-compose.yml`、`deploy/.env.example`、`docs/ops/monitoring.md`

## 1. 架构总览

| 服务 | 镜像/构建 | 容器名 | 默认端口 | 健康检查 |
| --- | --- | --- | --- | --- |
| web | `frontend/Dockerfile`（Next.js 16 standalone） | ccn-web | 3000 | `wget http://127.0.0.1:3000/` |
| backend | `backend/Dockerfile`（FastAPI + Python 3.12） | ccn-backend | 8000 | `GET /healthz`（含 DB 连通性） |
| db | `postgres:16-alpine` | ccn-db | 5432 | `pg_isready` |

- 网络：`ccn-net`（bridge）；数据卷：`ccn-pgdata`（数据库持久化）。
- 依赖顺序：`web → backend → db`（compose `depends_on: condition: service_healthy`）。
- 前端为纯客户端渲染，浏览器直接调用后端 API（`NEXT_PUBLIC_API_URL` 在镜像构建期内联），后端通过 CORS 放行前端来源。

## 2. 前置条件

- 一台 Linux 服务器（建议 2C4G 以上），安装 **Docker Engine ≥ 24** 与 **Compose v2 插件**：
  ```bash
  docker --version
  docker compose version
  ```
- 已配置域名与反向代理（可选，推荐 Nginx/Caddy 终结 TLS 后转发到 3000/8000）。
- 防火墙放行：80/443（对外）、3000/8000（如直接暴露）。

## 3. 首次部署（初始化）

```bash
# 1. 获取代码
git clone https://github.com/flichote/Continuum-Care-Network.git
cd Continuum-Care-Network

# 2. 准备生产环境变量（务必逐项替换，见 deploy/.env.example 注释）
cp deploy/.env.example deploy/.env
#   - 生成 JWT_SECRET：openssl rand -hex 32
#   - 生成 POSTGRES_PASSWORD / SEED_ADMIN_PASSWORD：openssl rand -hex 24
#   - 修改 CORS_ORIGINS 与 NEXT_PUBLIC_API_URL 为真实域名

# 3. 构建并启动（首次会拉取 postgres:16-alpine 与 node/python 基础镜像）
docker compose --env-file deploy/.env up -d --build

# 4. 等待健康检查通过（db → backend → web 顺序启动）
docker compose --env-file deploy/.env ps

# 5. 验证
curl -s http://localhost:8000/healthz          # {"status":"ok","database":"up",...}
curl -sI http://localhost:3000/                 # HTTP/1.1 200
docker compose --env-file deploy/.env logs -f backend   # 观察迁移与启动日志
```

> 说明：backend 容器启动命令内置 `alembic upgrade head`（幂等），首次启动自动完成建表；随后 `_seed_admin` 创建种子管理员（默认 `13800000000`，密码由 `SEED_ADMIN_PASSWORD` 控制）。生产环境创建后请立即修改密码。

## 4. 日常运维

```bash
# 查看状态与日志
docker compose --env-file deploy/.env ps
docker compose --env-file deploy/.env logs -f --tail=200 backend
docker compose --env-file deploy/.env logs -f --tail=200 web

# 重启单个服务（保留数据卷）
docker compose --env-file deploy/.env restart backend

# 进入容器调试（只读操作优先）
docker compose --env-file deploy/.env exec backend sh
docker compose --env-file deploy/.env exec db psql -U ccn -d continuum_care
```

## 5. 升级流程

```bash
# 1. 拉取新代码
git pull origin main

# 2. 检查迁移是否向后兼容（开发阶段通常直接升级）
#    如本次升级包含数据库 schema 变更，先看新迁移是否破坏性：
#    alembic 迁移文件在 backend/alembic/versions/，破坏性变更需先备份

# 3. 重新构建并滚动重启（先构建不重启，避免构建失败导致服务中断）
docker compose --env-file deploy/.env build

# 4. 应用新版本
docker compose --env-file deploy/.env up -d

# 5. 验证（重点：健康检查 + 迁移日志 + 关键接口）
docker compose --env-file deploy/.env ps
docker compose --env-file deploy/.env logs --tail=100 backend | grep -i -E "alembic|error|exception"
curl -s http://localhost:8000/healthz
```

升级原则：
- 先 `build` 再 `up`，构建失败不影响运行中的旧版本。
- 数据库迁移先于应用代码生效（backend command 先 `alembic upgrade head` 再启动 uvicorn）。
- 大版本升级建议先备份数据库（见第 7 节）。

## 6. 回滚流程

### 6.1 应用代码回滚（最常见）

```bash
# 方式 A：git 回退到上一个已发布 commit，重新构建
git checkout <上一版本commit>
docker compose --env-file deploy/.env build
docker compose --env-file deploy/.env up -d

# 方式 B：使用带 tag 的镜像回退（升级前先打 tag，见 deploy/.env 的 IMAGE_TAG）
IMAGE_TAG=<上一版本tag> docker compose --env-file deploy/.env up -d --no-build
```

### 6.2 数据库迁移回滚

Alembic 支持向下迁移，但**破坏性迁移（删列/删表）回滚会丢数据**，因此：

```bash
# 1. 进入 backend 容器查看当前版本
docker compose --env-file deploy/.env exec backend alembic current

# 2. 回退一个版本（如迁移 b129b8bc80c6 的下游版本）
docker compose --env-file deploy/.env exec backend alembic downgrade -1

# 3. 再回滚应用代码（见 6.1）
```

> 生产经验：破坏性变更不要直接 downgrade，应恢复备份（6.3）+ 回滚代码。

### 6.3 数据恢复（从备份）

见第 7 节「备份与恢复」的恢复命令，先恢复数据库再启动应用。

## 7. 备份与恢复

```bash
# ---------- 备份（建议 cron 每日执行，保留 N 天） ----------
# 逻辑备份：dump 到宿主机 deploy/backups/
docker compose --env-file deploy/.env exec -T db \
  pg_dump -U ccn -d continuum_care -Fc -f /tmp/ccn_$(date +%Y%m%d_%H%M%S).dump
docker cp ccn-db:/tmp/ccn_$(date +%Y%m%d_%H%M%S).dump deploy/backups/ 2>/dev/null || true

# 更稳妥：直接由宿主机连接容器端口导出（DB_PORT 暴露时）
pg_dump "postgresql://ccn:<password>@localhost:5432/continuum_care" -Fc > deploy/backups/ccn_$(date +%Y%m%d_%H%M%S).dump

# ---------- 恢复 ----------
# 1. 恢复前先停 backend（避免写库冲突）
docker compose --env-file deploy/.env stop backend
# 2. 将 dump 拷入 db 容器并恢复（会覆盖现有数据，务必先确认）
docker cp deploy/backups/ccn_<日期>.dump ccn-db:/tmp/restore.dump
docker compose --env-file deploy/.env exec db \
  pg_restore -U ccn -d continuum_care --clean --if-exists /tmp/restore.dump
# 3. 重新启动 backend
docker compose --env-file deploy/.env start backend
```

备份策略建议：
- 每日逻辑备份（pg_dump）+ 每周全量 + 保留 14 天；
- 备份文件存放于服务器之外（对象存储/异地）以防火备失效；
- 每月演练一次恢复流程（恢复演练是唯一能证明备份有效的办法）。

## 8. 常见故障排查

| 症状 | 排查命令 / 思路 |
| --- | --- |
| backend 一直重启 | `docker compose logs --tail=100 backend`；多为迁移失败或连不上 db（检查 `DATABASE_URL` 主机名是否为 `db`、密码是否一致） |
| db 起不来 | `docker compose logs db`；检查端口占用（`ss -ltnp | grep 5432`）与数据卷权限 |
| web 白屏/接口 401 | 浏览器 F12 看 `NEXT_PUBLIC_API_URL` 是否可访问；检查 backend CORS_ORIGINS 是否包含前端域名 |
| 页面 502/超时 | 反向代理未转发到 3000/8000；`docker compose ps` 看健康状态 |
| 磁盘告警 | `docker system df`；清理 `docker system prune -f`，检查 `ccn-pgdata` 卷增长 |
| 时区显示错乱 | 在 deploy/.env 设置 `TZ`（如 Asia/Shanghai），compose 已透传给 db 容器 |

## 9. 安全清单（上线前核对）

- [ ] `JWT_SECRET`、`POSTGRES_PASSWORD`、`SEED_ADMIN_PASSWORD` 已替换为强随机值，未使用示例默认值
- [ ] `CORS_ORIGINS` 仅包含真实前端来源，未使用 `*`
- [ ] `DB_PORT` 未暴露公网（建议 `127.0.0.1:5432` 或不映射）
- [ ] 服务器 22/80/443 端口已配置防火墙白名单
- [ ] 已配置 HTTPS（TLS 终结于反向代理）
- [ ] 每日数据库备份 cron 已生效，且已完成一次恢复演练
- [ ] 监控与告警已配置（见 docs/ops/monitoring.md）
- [ ] 种子管理员密码已在首次登录后修改
