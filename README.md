# Continuum-Care-Network（连续照护网络平台）

连接出院患者与专业康复师的持续照护平台。让 ICU 出院患者与康复医院出院患者回家后，仍能与专业康复师建立持续联系，被专业监测健康状况，实现"院内救治 — 院外康复 — 居家照护"的连续照护闭环。

## 项目简介

平台面向以下目标用户：

- **患者**：已在 ICU 完成紧急救治、或在康复医院完成常规治疗的患者。出院后可继续通过平台上报健康数据、执行康复计划、与康复师保持沟通。
- **康复师**：通过平台管理在册患者，制定康复计划，监测健康数据，及时响应异常告警。
- **管理员**：负责康复师资质审核、患者-康复师对接审核与平台治理。

## 功能列表

- **用户注册与登录**：角色化注册（患者/康复师/管理员），JWT 认证（access + refresh token）
- **患者档案**：基础信息、病史、紧急联系人等，隐私分级可见
- **康复师档案**：资质信息提交与管理员审核
- **患者-康复师对接/匹配**：绑定关系管理，管理员审核
- **健康数据上报**：血压、心率、体温、血氧饱和度等指标上报与趋势查看
- **康复计划制定与跟踪**：康复师制定计划，患者打卡执行，进度可视化
- **消息沟通**：绑定关系内一对一站内消息
- **异常指标告警**：阈值规则自动触发，通知患者与康复师
- **管理员审核**：资质审核、对接审核、阈值配置、审计日志

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Next.js 16.2.9（App Router + TypeScript + Tailwind CSS + React Compiler），shadcn/ui 风格组件 |
| 后端 | FastAPI 0.127.x（Python 3.12+，Pydantic v2，SQLAlchemy 2 async + asyncpg） |
| 认证 | JWT（access + refresh token），bcrypt/argon2 密码哈希，RBAC 权限中间件 |
| 数据库 | PostgreSQL 16+ |
| 部署 | Docker + docker-compose（web / backend / db 三服务） |
| CI | GitHub Actions |

详细说明见 [docs/tech-stack.md](docs/tech-stack.md)。

## 快速开始

> 前置条件：Docker 与 Docker Compose 已安装（本地开发后端也可以直接用 Python 3.12，见下方「后端本地启动」）。

```bash
# 1. 克隆仓库
git clone https://github.com/flichote/Continuum-Care-Network.git
cd Continuum-Care-Network

# 2. 复制环境变量示例并填写
cp .env.example .env

# 3. 一键启动（db / backend；web 前端接入中）
docker compose up -d --build

# 4. 访问
# 前端:      http://localhost:3000（接入中）
# 后端 API:  http://localhost:8000/docs  (Swagger UI)
```

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

运行测试：

```bash
cd backend
pytest            # 使用 SQLite 内存/文件数据库，无需 PostgreSQL
```

> 种子管理员（首次启动自动创建）：`13800000000` / `Admin123456`（可通过 .env 中 `SEED_ADMIN_*` 修改）。

## 目录结构

```
Continuum-Care-Network/
├── docs/
│   ├── PRD.md          # 产品需求文档（角色/功能/权限矩阵）
│   └── tech-stack.md   # 技术选型与决策记录
├── backend/            # 后端（FastAPI + PostgreSQL，已实现）
│   ├── app/
│   │   ├── main.py     # 应用入口（/docs、/healthz）
│   │   ├── core/       # 配置、JWT/bcrypt 安全、RBAC 依赖
│   │   ├── models/     # SQLAlchemy 2 async 模型
│   │   ├── schemas/    # Pydantic v2 校验模型
│   │   ├── api/v1/     # 认证/用户/患者/康复师/匹配/健康/计划/消息/告警/管理
│   │   └── services/   # 告警阈值评估、审计日志
│   ├── alembic/        # 数据库迁移（alembic upgrade head）
│   ├── tests/          # pytest（auth + health 示例）
│   └── scripts/        # 本地开发辅助脚本
├── web/                # 前端（Next.js，接入中）
├── docker-compose.yml  # db + backend 编排
├── .env.example
└── README.md
```

## 路线图

- **M0** 项目规划：PRD、技术选型、仓库骨架（当前）
- **M1** 认证与基础：注册登录、JWT、RBAC、角色档案
- **M2** 照护核心：绑定匹配、健康数据上报、康复计划
- **M3** 协作与安全：消息沟通、异常告警、管理员审核
- **M4** 上线准备：Docker 编排、CI、测试、部署

## 文档

- [产品需求文档（PRD）](docs/PRD.md)
- [技术选型文档](docs/tech-stack.md)

## 许可证

待定（规划阶段）。
