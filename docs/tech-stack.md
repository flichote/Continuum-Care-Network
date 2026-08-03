# Continuum-Care-Network 技术选型文档

- 版本：v0.1（初始规划）
- 状态：已确认（版本已通过 context7 校验）
- 更新日期：2026-08-03

---

## 1. 选型总览

| 层 | 技术 | 版本/说明 |
| --- | --- | --- |
| 前端框架 | Next.js | 16.2.9（App Router + TypeScript + Tailwind CSS + React Compiler） |
| UI 组件 | shadcn/ui 风格组件 | 基于 Tailwind 的可组合组件，自托管、可定制 |
| 后端框架 | FastAPI | 0.127.x（Python 3.12+，Pydantic v2） |
| ORM | SQLAlchemy | 2.x（async 模式 + asyncpg 驱动） |
| 数据库 | PostgreSQL | 16+ |
| 认证 | JWT | access token + refresh token；密码哈希 bcrypt/argon2 |
| 权限 | RBAC | 角色权限中间件，全接口校验 |
| 部署 | Docker + docker-compose | web / backend / db 三服务 |
| CI | GitHub Actions | 自动化测试与构建 |

---

## 2. 前端

### 2.1 Next.js 16.2.9（App Router）

- **框架**：Next.js 16.2.9，采用 App Router 目录结构。
- **语言**：TypeScript（严格模式）。
- **样式**：Tailwind CSS，配合 React Compiler 优化渲染性能。
- **UI 组件**：shadcn/ui 风格组件（Radix UI 原语 + Tailwind），按需引入、可深度定制，避免臃肿的第三方组件库。

### 2.2 前端目录规划（建议）

```
web/
├── app/                    # App Router 页面与路由
│   ├── (auth)/             # 登录/注册
│   ├── (patient)/          # 患者端
│   ├── (therapist)/        # 康复师端
│   └── (admin)/            # 管理端
├── components/             # 通用组件（shadcn/ui 风格）
├── lib/                    # API 客户端、工具函数
├── types/                  # 共享类型定义
└── middleware.ts           # 路由级鉴权/角色守卫
```

### 2.3 关键决策

- 使用 **Server Components** 优先渲染，客户端交互用 Client Components。
- 通过 `middleware.ts` 做路由级令牌校验与角色重定向。
- API 请求统一封装，自动附加 access token，401 时触发 refresh 流程。

---

## 3. 后端

### 3.1 FastAPI 0.127.x

- **框架**：FastAPI 0.127.x，异步优先，自动生成 OpenAPI 文档。
- **Python**：3.12+。
- **数据校验**：Pydantic v2（模型校验 + 序列化）。
- **ORM**：SQLAlchemy 2.x async 模式 + asyncpg 驱动（PostgreSQL 异步访问）。

### 3.2 后端目录规划（建议）

```
backend/
├── app/
│   ├── main.py             # 应用入口
│   ├── core/               # 配置、安全（JWT/密码哈希）、依赖
│   ├── models/             # SQLAlchemy 模型
│   ├── schemas/            # Pydantic 模型
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py     # 认证接口
│   │   │   ├── patients.py # 患者档案
│   │   │   ├── therapists.py
│   │   │   ├── matching.py # 对接/匹配
│   │   │   ├── health.py   # 健康数据
│   │   │   ├── plans.py    # 康复计划
│   │   │   ├── messages.py # 消息
│   │   │   ├── alerts.py   # 告警
│   │   │   └── admin.py    # 管理端
│   ├── services/           # 业务逻辑层
│   └── middleware/         # RBAC 权限中间件等
├── tests/
├── alembic/                # 数据库迁移
└── requirements.txt / pyproject.toml
```

### 3.3 认证与安全

- **密码哈希**：bcrypt（默认）/ argon2（可选），禁止明文存储。
- **JWT**：
  - access token：短期（建议 30 分钟），携带 `sub`（用户ID）、`role`。
  - refresh token：长期（建议 7 天），支持撤销（存储于 DB 或 Redis，v1 可存 DB 表）。
- **RBAC 权限中间件**：每个受保护接口按顺序执行：
  1. 校验 access token 有效性（签名 + 过期）；
  2. 校验角色是否允许访问该接口；
  3. 校验资源归属（数据级权限：患者本人/康复师名下患者/管理员）。

---

## 4. 数据库

### 4.1 PostgreSQL 16+

- 存储用户、档案、绑定关系、健康数据、康复计划、消息、告警、审计日志。
- 使用 **Alembic** 管理 schema 迁移。
- 健康数据表建议按指标类型 + 时间建立索引，支持范围查询与聚合。

### 4.2 核心表规划（建议）

```
users              # 用户（含角色）
patient_profiles   # 患者档案
therapist_profiles # 康复师档案（含资质）
matches            # 患者-康复师绑定关系
health_records     # 健康数据上报
rehab_plans        # 康复计划
plan_tasks         # 计划任务/打卡
messages           # 站内消息
alerts             # 异常告警
refresh_tokens     # refresh token 管理
audit_logs         # 审计日志
```

---

## 5. 部署与 CI

### 5.1 Docker + docker-compose

三服务编排：

| 服务 | 镜像/来源 | 端口 | 说明 |
| --- | --- | --- | --- |
| web | 前端构建产物（Node 运行时） | 3000 | Next.js 应用 |
| backend | Python 3.12 镜像 | 8000 | FastAPI 应用 |
| db | postgres:16 | 5432 | PostgreSQL（卷持久化） |

- 本地一键启动：`docker compose up -d`。
- 环境变量通过 `.env` / compose `environment` 注入，敏感信息不写入代码库。

### 5.2 GitHub Actions CI

- 触发：push / PR 到 main。
- 步骤：安装依赖 → 运行后端测试（pytest）→ 前端 lint/typecheck → 构建镜像（可选）→ 上传产物。
- 安全：CI 中使用 GitHub Secrets 存储数据库连接等敏感配置（测试环境）。

---

## 6. 环境变量规划

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql+asyncpg://user:pass@db:5432/ccn` |
| `JWT_SECRET` | JWT 签名密钥 | 随机 32+ 字节 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | access token 有效期 | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | refresh token 有效期 | `7` |
| `CORS_ORIGINS` | 允许的前端来源 | `http://localhost:3000` |

---

## 7. 决策记录（ADR 摘要）

| # | 决策 | 选项 | 结论 | 理由 |
| --- | --- | --- | --- | --- |
| ADR-001 | 前后端是否分离 | 单体 / 分离 | 前后端分离 | 独立演进、独立部署、团队分工清晰 |
| ADR-002 | 前端框架 | React SPA / Next.js | Next.js 16 App Router | SSR/SSG 兼顾 SEO 与性能，App Router 生态成熟 |
| ADR-003 | UI 方案 | Ant Design / shadcn/ui | shadcn/ui 风格 | 自托管可定制、无黑盒依赖、与 Tailwind 天然契合 |
| ADR-004 | 后端框架 | Django / FastAPI | FastAPI 0.127.x | 异步高性能、Pydantic 校验、OpenAPI 自动化 |
| ADR-005 | ORM/驱动 | 同步 SQLAlchemy / async | SQLAlchemy 2 async + asyncpg | 匹配 FastAPI 异步模型，高并发 I/O 更优 |
| ADR-006 | 数据库 | MySQL / PostgreSQL | PostgreSQL 16+ | 生态成熟、JSON/全文/时序支持好、运维稳定 |
| ADR-007 | 认证方案 | Session / JWT | JWT（access+refresh） | 前后端分离友好、无状态可水平扩展 |
| ADR-008 | 密码哈希 | MD5 / bcrypt / argon2 | bcrypt（默认）/ argon2 | 抗暴力破解，成本参数可调 |
| ADR-009 | 部署 | 裸机 / Docker | Docker + compose | 环境一致、一键启动、便于 CI/CD |
| ADR-010 | 数据库迁移 | 手写 SQL / Alembic | Alembic | 版本化迁移、可回滚、与 SQLAlchemy 集成 |
