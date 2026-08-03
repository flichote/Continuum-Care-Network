# Continuum-Care-Network 前端（Next.js 16）

连续照护网络平台的前端应用：连接出院患者与专业康复师，提供健康数据上报、康复计划跟踪、异常告警与站内消息。

## 技术栈

- **Next.js 16.2.9**（App Router + TypeScript + Tailwind CSS v4 + React Compiler）
- **状态管理**：React Context（`lib/auth.tsx`，token / 用户信息）
- **API 客户端**：`lib/api.ts`（fetch 封装，自动附加 JWT，401 自动 refresh 并重试）
- **图表**：Recharts（健康数据趋势图、看板统计图）
- **图标**：Lucide React
- **路由守卫**：`proxy.ts`（Next.js 16 proxy）按角色 cookie 做体验级跳转，客户端 `RequireRole` 兜底

## 快速开始

```bash
# 1. 安装依赖（要求 Node.js 20.9+ / 18.18+）
npm install

# 2. 配置环境变量（默认指向本机后端 http://localhost:8000/api/v1）
cp .env.example .env.local

# 3. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | 后端 API 基址（含 `/api/v1` 前缀） | `http://localhost:8000/api/v1` |

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式（Turbopack，热更新） |
| `npm run build` | 生产构建（类型检查 + 静态生成，不依赖后端） |
| `npm start` | 运行生产构建产物 |
| `npm run lint` | ESLint 检查 |

## 目录结构

```
frontend/
├── app/                    # App Router 路由
│   ├── (auth)/             # 登录 / 注册 / 找回密码 / 档案完善（onboarding）
│   ├── (patient)/          # 患者端：仪表盘、健康数据、我的康复师、康复计划、消息、档案
│   ├── (therapist)/        # 康复师端：患者列表、患者详情、制定计划、监测看板、消息、档案
│   ├── (admin)/            # 管理端：数据看板、审核、用户、阈值、审计
│   └── page.tsx            # 首页（按登录态/角色重定向）
├── components/
│   ├── ui/                 # 基础组件（Button/Input/Card/Badge/Alert/Drawer/Toast 等）
│   ├── layout/             # AppShell / AdminShell / RequireRole
│   └── feature/            # 业务组件（auth / health / plan / chat / admin / stats 等）
├── lib/
│   ├── api.ts              # API 客户端（JWT + 401 刷新）
│   ├── auth.tsx            # AuthProvider / useAuth
│   ├── constants.ts        # 指标定义、状态映射等
│   └── utils.ts            # 工具函数
├── types/index.ts          # 与后端 OpenAPI 对齐的类型
├── proxy.ts                # 路由级守卫（Next.js 16 proxy）
└── .env.example
```

## 账号

- 注册时选择角色（患者 / 康复师），康复师注册后需管理员审核资质。
- 种子管理员：`13800000000` / `Admin123456`（由后端首次启动创建）。
