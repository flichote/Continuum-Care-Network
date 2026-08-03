# Continuum-Care-Network（延续康护平台）

连接出院患者与专业康复师的持续照护平台。让 ICU 出院患者与康复医院出院患者回家后，仍能与专业康复师建立持续联系，被专业监测健康状况，实现「院内救治 — 院外康复 — 居家照护」的连续照护闭环。

## 项目简介

平台面向以下目标用户：

- **患者**：已在 ICU 完成紧急救治、或在康复医院完成常规治疗的患者。出院后可继续通过平台上报健康数据、执行康复计划、与康复师保持沟通。
- **康复师**：通过平台管理在册患者，制定康复计划，监测健康数据，及时响应异常告警。
- **管理员**：负责康复师资质审核、患者-康复师对接审核与平台治理。

## 功能特性（按角色）

### 患者（Patient）
- 角色化注册与登录（JWT access + refresh token），找回密码入口
- 个人档案维护：基础信息、病史、紧急联系人等，隐私分级可见
- 健康数据上报：血压、心率、体温、血氧饱和度（SpO2）等指标，服务端范围校验
- 趋势查看：健康指标历史记录与图表化趋势
- 康复计划：查看康复师制定的计划与阶段任务，执行打卡
- 消息沟通：与绑定的康复师一对一站内消息，未读数提醒
- 异常告警：接收本人异常指标告警与历史告警列表

### 康复师（Therapist）
- 注册并提交资质（执业机构、资格证书、擅长方向等），管理员审核通过后入驻
- 患者管理：查看名下患者的档案与健康数据（含趋势聚合）
- 康复计划：为名下患者制定、调整计划，跟踪打卡执行进度（完成率）
- 消息沟通：与名下患者站内消息
- 异常告警：接收名下患者告警，标记「已处理/已联系」留痕

### 管理员（Admin）
- 康复师资质审核：通过 / 驳回（需填写原因）
- 对接审核：患者-康复师绑定 / 解绑申请审核
- 阈值配置：维护异常指标告警阈值规则
- 用户管理：查看用户列表、停用违规账号
- 审计日志：查看关键操作审计（登录、审核、绑定变更等）

详细需求与权限矩阵见 [docs/PRD.md](docs/PRD.md)。

## 技术栈

| 层 | 技术 | 版本 |
| --- | --- | --- |
| 前端框架 | Next.js（App Router + TypeScript 严格模式 + React Compiler） | 16.2.9 |
| UI | Tailwind CSS + shadcn/ui 风格组件、lucide-react 图标 | Tailwind 4 / lucide 1.28.0 |
| 图表 | recharts | 3.10.1 |
| 后端框架 | FastAPI（Python 3.12+，Pydantic v2） | 0.127.x |
| ORM | SQLAlchemy 2 async + asyncpg 驱动 | 2.0.x |
| 认证 | JWT（access 30min + refresh 7d）、bcrypt 密码哈希、RBAC 权限中间件 | PyJWT 2.9 / bcrypt 4.1 |
| 数据库 | PostgreSQL | 16（镜像 postgres:16-alpine） |
| 迁移 | Alembic | 1.13+ |
| 测试 | pytest + pytest-asyncio + httpx（SQLite 内存/文件库） | pytest 8+ |
| 部署 | Docker + Docker Compose（web / backend / db 三服务） | Compose v2 |
| CI | GitHub Actions（pytest + lint + build + docker 构建与 compose 校验） | — |

> 详细选型背景与 ADR 见 [docs/tech-stack.md](docs/tech-stack.md)。

## 快速开始

> 前置条件：已安装 Docker 与 Docker Compose（本地开发后端也可以直接用 Python 3.12，见下方「后端本地启动」）。

```bash
# 1. 克隆仓库
git clone https://github.com/flichote/Continuum-Care-Network.git
cd Continuum-Care-Network

# 2. 复制环境变量示例并填写（本地开发可直接使用默认值）
cp .env.example .env

# 3. 一键启动（web / backend / db 三服务）
docker compose up -d --build

# 4. 访问
# 前端:      http://localhost:3000
# 后端 API:  http://localhost:8000/docs  (Swagger UI)
# 健康检查:  curl http://localhost:8000/healthz
```

> 种子管理员（backend 首次启动自动创建）：`13800000000` / `Admin123456`（可通过 .env 中 `SEED_ADMIN_*` 修改）。

### 前端本地启动（Next.js 16）

```bash
cd frontend

# 安装依赖（要求 Node.js 20.9+ / 18.18+）
npm install

# 复制环境变量示例并填写（默认指向本机后端 http://localhost:8000/api/v1）
cp .env.example .env.local

# 开发模式
npm run dev
# 打开 http://localhost:3000

# 生产构建验证（无后端也可执行）
npm run build
npm start
```

> 前端为纯客户端渲染（App Router + "use client"），构建不依赖后端服务；运行时需后端 API 提供数据（`NEXT_PUBLIC_API_URL` 指向 FastAPI 的 `/api/v1` 前缀）。

### 后端本地启动（不依赖 Docker 时）

```bash
cd backend

# 创建虚拟环境（要求 Python 3.12+）
python -m venv .venv
source .venv/Scripts/activate        # Windows (git-bash)；Linux/macOS: source .venv/bin/activate

# 安装依赖
pip install -r requirements-dev.txt

# 方式 A：有 Docker —— 只起数据库
cd .. && docker compose up -d db && cd backend

# 方式 B：无 Docker —— 使用嵌入式 PostgreSQL（开发依赖 pgserver 提供）
python scripts/start_embedded_pg.py   # 自动下载并启动本地 PostgreSQL 16（端口 55432）

# 运行数据库迁移（production 环境必需；development 环境启动时也会自动建表）
alembic upgrade head

# 启动 API
uvicorn app.main:app --reload --port 8000

# 验证
curl http://localhost:8000/healthz
# 打开 http://localhost:8000/docs 查看自动生成的 API 文档
```

## 测试方法

### 后端自动化测试（pytest，33 条用例）

```bash
cd backend
pytest            # 使用 SQLite 内存/文件数据库，无需 PostgreSQL
```

覆盖：认证（9）、越权访问（2）、患者/康复师/匹配/计划/消息/告警/管理扩展（18）、健康检查与 OpenAPI（3）、解绑驳回回归（1）。

> Windows 注意：如本机全局 `PYTHONPATH` 指向其他 venv，先 `unset PYTHONPATH` 再运行，避免 import 到错误的 fastapi/pydantic。

### 真实服务烟测（19 项链路）

```bash
cd backend
# 启动真实 uvicorn 服务（SQLite 文件库）
DATABASE_URL=sqlite+aiosqlite:///smoke_ccn.db ENV=development uvicorn app.main:app --port 8010
# 另开终端执行全链路烟测脚本（注册→建档→审核→绑定→上报→告警→消息→计划→审计）
python scripts/smoke_test.py
# 期望输出：=== SMOKE RESULT: 19/19 passed ===
```

### 前端检查

```bash
cd frontend
npm run lint      # ESLint（0 errors）
npm run build     # 生产构建（27 条路由）
```

### CI（GitHub Actions）

push / PR 到 main 自动执行：backend pytest → frontend lint + build → docker 镜像构建 + compose 语法校验。见 [.github/workflows/ci.yml](.github/workflows/ci.yml)。

详细测试用例与结果见 [docs/qa/test-cases.md](docs/qa/test-cases.md) 与 [docs/qa/test-report.md](docs/qa/test-report.md)。

## 部署说明

生产环境使用 Docker Compose 三服务编排（web / backend / db），backend 容器启动时自动执行幂等迁移（`alembic upgrade head`）。

```bash
# 1. 准备生产环境变量（务必逐项替换，生成强随机值）
cp deploy/.env.example deploy/.env
#   openssl rand -hex 32   # JWT_SECRET
#   openssl rand -hex 24   # POSTGRES_PASSWORD / SEED_ADMIN_PASSWORD

# 2. 构建并启动（db → backend → web 按健康检查顺序拉起）
docker compose --env-file deploy/.env up -d --build

# 3. 验证
docker compose --env-file deploy/.env ps
curl -s http://localhost:8000/healthz
```

- 部署手册（初始化 / 升级 / 回滚 / 备份）：[docs/ops/deploy.md](docs/ops/deploy.md)
- 监控方案（日志 / 健康检查 / 告警）：[docs/ops/monitoring.md](docs/ops/monitoring.md)

## 目录结构

```
Continuum-Care-Network/
├── docs/                    # 项目文档
│   ├── PRD.md               # 产品需求文档（角色/功能/权限矩阵）
│   ├── tech-stack.md        # 技术选型与决策记录（ADR）
│   ├── design/              # UI/UX 设计（设计系统/页面/交互流程/组件规范）
│   ├── ops/                 # 运维（deploy.md 部署手册、monitoring.md 监控方案）
│   └── qa/                  # 质量（test-cases.md 测试用例、test-report.md 测试报告）
├── backend/                 # 后端（FastAPI + PostgreSQL）
│   ├── app/
│   │   ├── main.py          # 应用入口（/docs、/healthz）
│   │   ├── core/            # 配置、JWT/bcrypt 安全、RBAC 依赖
│   │   ├── models/          # SQLAlchemy 2 async 模型
│   │   ├── schemas/         # Pydantic v2 校验模型
│   │   ├── api/v1/          # 认证/用户/患者/康复师/匹配/健康/计划/消息/告警/管理
│   │   └── services/        # 告警阈值评估、审计日志
│   ├── alembic/             # 数据库迁移（alembic upgrade head）
│   ├── tests/               # pytest（33 条用例）
│   ├── scripts/             # 烟测脚本、嵌入式 PostgreSQL 启动脚本
│   └── Dockerfile           # 后端多阶段镜像
├── frontend/                # 前端（Next.js 16 App Router + TS + Tailwind）
│   ├── app/                 # 路由分组 (auth)/(patient)/(therapist)/(admin) + 全局页
│   ├── components/          # ui（基础组件）/ layout / feature（业务组件）
│   ├── lib/                 # api 客户端（JWT 自动附加 + 401 刷新）、auth 上下文、常量
│   ├── types/               # 与后端 OpenAPI 对齐的 TS 类型
│   ├── proxy.ts             # 路由守卫（未登录/角色限制，Next.js 16 proxy）
│   └── Dockerfile           # 前端多阶段镜像（standalone）
├── deploy/
│   └── .env.example         # 生产环境变量模板
├── docker-compose.yml       # web + backend + db 三服务编排（健康检查/卷/网络）
├── .github/
│   └── workflows/ci.yml     # CI（pytest + lint + build + docker）
├── .env.example             # 本地开发环境变量模板
└── README.md
```

## 路线图

- [x] **M0** 项目规划：PRD、技术选型、仓库骨架
- [x] **M1** 认证与基础：注册登录、JWT、RBAC、角色档案
- [x] **M2** 照护核心：绑定匹配、健康数据上报、康复计划
- [x] **M3** 协作与安全：消息沟通、异常告警、管理员审核
- [x] **M4** 上线准备：Docker 编排、CI、测试、部署

## 文档索引

- [产品需求文档（PRD）](docs/PRD.md)
- [技术选型文档（tech-stack）](docs/tech-stack.md)
- [UI/UX 设计](docs/design/design-system.md) · [页面结构](docs/design/pages.md) · [交互流程](docs/design/flows.md) · [组件规范](docs/design/components.md)
- [部署手册](docs/ops/deploy.md) · [监控方案](docs/ops/monitoring.md)
- [测试用例](docs/qa/test-cases.md) · [测试报告](docs/qa/test-report.md)

## 许可证

待定（规划阶段）。
