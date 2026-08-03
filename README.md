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

> 前置条件：Docker 与 Docker Compose 已安装。

```bash
# 1. 克隆仓库
git clone https://github.com/flichote/Continuum-Care-Network.git
cd Continuum-Care-Network

# 2. 复制环境变量示例并填写
cp .env.example .env

# 3. 一键启动（web / backend / db）
docker compose up -d

# 4. 访问
# 前端:      http://localhost:3000
# 后端 API:  http://localhost:8000/docs  (Swagger UI)
```

> 注：`docker compose` 编排与 `.env.example` 将在 M4（上线准备）阶段落地，当前仓库处于 M0 规划阶段。

## 目录结构

```
Continuum-Care-Network/
├── docs/
│   ├── PRD.md          # 产品需求文档（角色/功能/权限矩阵）
│   └── tech-stack.md   # 技术选型与决策记录
├── web/                # 前端（Next.js，规划中）
├── backend/            # 后端（FastAPI，规划中）
├── .gitignore
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
