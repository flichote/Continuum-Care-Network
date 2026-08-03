# Continuum-Care-Network 页面级组件规范

- 版本：v0.1
- 配套文档：`design-system.md`（基础组件与 token）、`pages.md`（页面结构）、`flows.md`（交互流程）
- 用途：开发实现页面时的**组件清单与布局对照**。每个页面列出：布局结构（ASCII 线框）+ 主要组件清单（名称、来源、关键 props/状态）。

> 组件来源标注：`[ui]` = 通用基础组件（放 `web/components/ui/`，shadcn/ui 风格，见 design-system.md §7）；`[layout]` = 布局组件；`[feature]` = 页面私有业务组件。所有页面骨架加载态使用 Skeleton（design-system.md §7.10）。

---

## 0. 全局布局组件

### 0.1 AppShell（患者/康复师共用）

```
┌─────────────────────────────────────────────┐
│ Topbar (h-16): 品牌/标题 · 通知铃铛 · 头像菜单  │
├──────────┬──────────────────────────────────┤
│ Sidebar  │                                  │
│ (w-60,   │  Main (max-w-1200px mx-auto)     │
│  ≥1024px)│  内容区（Outlet）                 │
│          │                                  │
├──────────┴──────────────────────────────────┤
│ MobileTabBar (仅 <1024px, h-14, fixed bottom)│
└─────────────────────────────────────────────┘
```

组件：`[layout] Topbar`（props: title, unreadCount）、`[layout] Sidebar`（items, activeKey, badgeMap）、`[layout] MobileTabBar`（items, activeKey）、`[layout] NotificationBell`（未读红点/数字）、`[ui] AvatarMenu`（头像、下拉：个人档案/退出登录）。

### 0.2 AdminShell

```
┌─────────────────────────────────────────────┐
│ Topbar (h-16): 品牌 · 管理员标识 · 退出        │
├──────────┬──────────────────────────────────┤
│ Sidebar  │  Main (max-w-1200px mx-auto)     │
│ (w-60,   │  内容区（Outlet）                 │
│  管理菜单)│                                  │
└──────────┴──────────────────────────────────┘
```

---

## 1. 认证页

### 1.1 登录页 `/login`

```
┌───────────────────────┐
│ 品牌区（Logo+标语）     │
│ ┌───────────────────┐ │
│ │ 页面标题           │ │
│ │ 账号输入 [ui Input]│ │
│ │ 密码输入 [ui Input]│ │
│ │ 登录按钮 [ui Btn]  │ │
│ │ 忘记密码/去注册    │ │
│ └───────────────────┘ │
└───────────────────────┘
```

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| AuthCard | [feature] | 440px 居中卡片容器 |
| Input | [ui] | 账号（text）、密码（password，带显示/隐藏） |
| Button | [ui] | primary / lg / 全宽；提交 loading |
| Alert | [ui] | danger：登录失败、账号被停用 |

### 1.2 注册页 `/register`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| Stepper | [feature] | 步骤指示器（账号信息 → 角色选择） |
| Input / PasswordStrength | [ui]/[feature] | 密码强度条（弱/中/强） |
| RoleCard | [feature] | 患者/康复师角色卡，可选中（radio 语义） |
| Button | [ui] | primary / lg / 全宽 |

### 1.3 档案完善 `/onboarding/patient`、`/onboarding/therapist`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| FormField / Input / Select / RadioGroup / DatePicker | [ui] | 见 design-system §7.2 |
| UploadDropzone | [feature] | 拖拽/点击上传，文件卡列表（名称/大小/状态/删除） |
| ChipsSelect（多选） | [feature] | 擅长方向多选 chips |
| TextArea | [ui] | 既往病史、简介（含字数统计） |
| Button | [ui] | primary 提交（loading） |

---

## 2. 患者端

### 2.1 首页仪表盘 `/patient`

```
┌─────────────────────────────────────────────┐
│ 欢迎横幅（渐变）: 问候语 + 上报今日数据 [primary]│
├──────────┬──────────┬──────────┬──────────┤
│ 血压卡    │ 心率卡    │ 体温卡    │ 血氧卡    │
├──────────┴──────────┴──────────┴──────────┤
│ 告警提醒（若有）[Alert warning/danger]        │
├──────────────────┬────────────────────────┤
│ 待办任务列表       │ 我的康复师卡             │
│  · 任务1 [打卡]   │  · 联系康复师 [outline]   │
│  · 任务2 [打卡]   │ 最近消息预览（未读点）     │
└──────────────────┴────────────────────────┘
```

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| WelcomeBanner | [feature] | 渐变卡；含 QuickReportButton（primary） |
| MetricCard | [feature] | props: label, value, unit, status(normal/warning/critical), trend |
| Alert | [ui] | 未处理告警横幅（点击跳 /patient/health 告警） |
| TaskItem | [feature] | 今日康复任务（名称/频次/时长 + CheckinButton accent） |
| TherapistCard | [feature] | 已绑定：康复师信息 + 发消息；未绑定：MatchGuideCard |
| MessagePreview | [feature] | 最近消息 + 未读红点 |

### 2.2 健康数据上报 `/patient/health`

```
┌─────────────────────────────────────────────┐
│ 上报表单卡                                    │
│  收缩压[ ]mmHg  舒张压[ ]mmHg  心率[ ]次/分   │
│  体温[ ]°C  血氧[ ]%                         │
│  [提交上报 primary lg]                       │
├─────────────────────────────────────────────┤
│ 今日已上报摘要（若有）                         │
├──────────┬──────────────────────────────────┤
│ 历史列表  │ 趋势图（Tab: 血压/心率/体温/血氧）  │
└──────────┴──────────────────────────────────┘
```

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| MetricInputGroup | [feature] | 数值输入 + 单位后缀 + 即时校验 |
| Button | [ui] | primary 提交（loading 防重复） |
| ReportSummaryCard | [feature] | 今日上报摘要（时间/各值） |
| RecordList | [feature] | 历史记录（时间倒序、分页、状态徽标） |
| TrendChart | [feature] | 折线图 + 参考区间带 + 越界点标红；7/30 天切换 |

### 2.3 我的康复师 `/patient/therapist`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| BindStatusCard | [feature] | 状态徽标 + 说明 + 操作按钮（申请/更换） |
| TherapistProfileCard | [feature] | 头像、机构、类别、资格证号（脱敏）、擅长 chips、简介 |
| Button / ConfirmDialog | [ui] | 申请更换 → 确认弹窗 |

### 2.4 康复计划 `/patient/plans`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| PlanOverviewCard | [feature] | 目标、周期、完成率 ProgressBar |
| StageGroup / TaskCard | [feature] | 阶段分组任务；TaskCard 含 CheckinButton |
| CheckinDialog | [feature] | 打卡：完成状态、疼痛评分滑块（1–10）、备注 |
| EmptyState | [ui] | 无计划等待卡 |

### 2.5 消息 `/patient/messages`

```
┌───────────────┬──────────────────────────────┐
│ 会话列表       │ 聊天窗口                       │
│ (w-72, ≥768px)│  消息气泡列表（滚动）           │
│ 头像/最后消息/  │  输入区: [Input] [发送]        │
│ 未读徽标       │                               │
└───────────────┴──────────────────────────────┘
（移动端：列表 ↔ 聊天两屏切换）
```

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| ConversationList | [feature] | 会话项（未读徽标） |
| ChatWindow | [feature] | 气泡（本人右/对方左）、时间分隔线、自动滚动到底 |
| MessageInput | [feature] | 文本输入 + 发送；图片按钮 disabled |

### 2.6 个人档案 `/patient/profile`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| ProfileForm | [feature] | 编辑态表单（基本资料/健康档案/紧急联系人） |
| UploadPreview | [feature] | 出院小结查看/重传 |
| Button / ConfirmDialog | [ui] | 保存 / 退出登录确认 |

---

## 3. 康复师端

### 3.1 患者列表 `/therapist`

```
┌─────────────────────────────────────────────┐
│ 统计条: 在册患者 | 待处理告警 | 计划执行中 | 新增 │
├─────────────────────────────────────────────┤
│ 搜索[ ] 筛选[全部/需关注/告警中]              │
├─────────────────────────────────────────────┤
│ 患者列表（卡片/表格，行内状态点+告警徽标）      │
│  · 王**  最近上报 10:20   [正常] [详情]       │
│  · 李**  最近上报 08:10   [紧急!] [详情]      │
└─────────────────────────────────────────────┘
```

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| StatsStrip | [feature] | 4 个统计卡（告警数红色高亮） |
| SearchInput / FilterTabs | [ui] | 搜索 + 状态筛选 |
| PatientTable / PatientCard | [feature] | 头像+姓名、最近上报、状态点、告警徽标、操作 |
| AlertBanner | [ui] | 紧急告警置顶横幅（点击筛选） |

### 3.2 患者详情 `/therapist/patients/[id]`

```
┌─────────────────────────────────────────────┐
│ ← 返回 | 王** [active] | [发消息 outline]     │
├─────────────────────────────────────────────┤
│ Tabs: 概览 | 健康数据 | 康复计划 | 告警 | 档案  │
├─────────────────────────────────────────────┤
│ Tab 内容区                                    │
└─────────────────────────────────────────────┘
```

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| Tabs | [ui] | 5 个 Tab |
| OverviewCards | [feature] | 基本信息/最近数据/计划摘要/未处理告警 |
| TrendChart / RecordTable | [feature] | 复用患者端图表 + 表格（含异常标注） |
| PlanSummary / PlanList | [feature] | 计划详情/列表 + 「新建/调整计划」 |
| AlertList | [feature] | 告警列表（级别、指标、时间、状态、处理按钮） |
| PatientProfileView | [feature] | 档案只读（紧急联系人隐藏） |

### 3.3 制定/编辑康复计划 `/therapist/patients/[id]/plan`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| PlanForm | [feature] | 目标、周期、说明 |
| StageTaskEditor | [feature] | 阶段+任务动态编辑器（增删排序） |
| RevisionHistory | [feature] | 调整历史折叠面板 |
| Button | [ui] | 保存草稿（outline）/ 发布（primary + 确认弹窗） |

### 3.4 数据监测看板 `/therapist/dashboard`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| AlertList（未处理） | [feature] | 按级别排序，danger 置顶，行内处理按钮 |
| RiskPatientCard | [feature] | 连续越界患者卡（7 天异常次数） |
| ProgressBarList | [feature] | 各患者计划完成率 |
| ActivityBarChart | [feature] | 近 7 天上报人次柱状图 |

### 3.5 消息 `/therapist/messages`

与患者端 2.5 相同结构；会话对象为名下患者；可携带患者上下文进入（从患者详情点「发消息」）。

### 3.6 个人档案 `/therapist/profile`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| ReviewStatusBadge | [feature] | 已通过/审核中/已驳回（+原因 +重新提交） |
| QualificationForm | [feature] | 执业信息 + 材料查看 |
| ProfileForm / Button | [feature]/[ui] | 专业信息编辑、保存 |

---

## 4. 管理端

### 4.1 数据看板 `/admin`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| StatsGrid | [feature] | 平台指标统计卡 |
| AlertTrendChart / AlertTypeChart | [feature] | 7 天告警趋势 + 类型分布 |
| ReviewTodoCard | [feature] | 待审康复师/待审对接快捷入口 |
| AuditFeed | [feature] | 最近审计日志摘要 |

### 4.2 康复师认证审核 `/admin/reviews/therapists`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| FilterTabs | [ui] | 全部/待审核/已通过/已驳回 |
| ReviewTable | [feature] | 表格：姓名、机构、提交时间、状态徽标、操作 |
| ReviewDrawer | [feature] | 详情抽屉：资质信息 + 材料预览 + 驳回原因输入 + 通过/驳回 |

### 4.3 对接审核 `/admin/reviews/matchings`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| FilterTabs | [ui] | 待审核绑定/待审核解绑/已生效 |
| MatchingTable | [feature] | 患者、康复师、类型、时间、状态、操作 |
| MatchingDetail | [feature] | 双方摘要卡 + 申请理由 + 通过/驳回 |

### 4.4 用户管理 `/admin/users`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| UserTable | [feature] | 用户、角色、状态、注册时间、操作 |
| ConfirmDialog | [ui] | 停用确认（danger） |
| SearchInput / FilterTabs | [ui] | 搜索 + 角色筛选 |

### 4.5 告警阈值配置 `/admin/thresholds`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| ThresholdTable | [feature] | 指标、下限、上限、单位、启用开关 |
| ThresholdEditor | [feature] | 弹窗/内联编辑（校验下限<上限） |
| Switch | [ui] | 启用/停用 |

### 4.6 审计日志 `/admin/audit`

| 组件 | 来源 | 说明 |
| --- | --- | --- |
| AuditTable | [feature] | 时间、操作者、类型、对象、IP、结果（只读，分页 20/页） |
| FilterBar | [feature] | 类型、时间范围、搜索 |

---

## 5. 错误页

| 页面 | 组件 | 说明 |
| --- | --- | --- |
| /404 | ErrorHero | 404 图形 + 文案 + 「返回首页」primary |
| /403 | ErrorHero | 锁图标 + 文案 + 「返回我的工作台」primary |
| /500 | ErrorHero | 警示图标 + 文案 + 「重试」（secondary）+「返回首页」 |

---

## 6. 组件复用矩阵（开发提示）

| 组件 | 患者端 | 康复师端 | 管理端 |
| --- | --- | --- | --- |
| TrendChart / RecordTable | ✅ | ✅（患者详情） | — |
| ConversationList / ChatWindow | ✅ | ✅ | — |
| Tabs | ✅（计划/数据） | ✅（患者详情） | ✅（审核页） |
| FilterTabs / SearchInput | — | ✅ | ✅ |
| ConfirmDialog / Toast / Alert / Badge | ✅ | ✅ | ✅ |
| ReviewDrawer 模式 | — | — | ✅（可复用于详情抽屉） |

> 实现建议：`TrendChart`、`RecordTable`、`ConversationList`、`ChatWindow`、`ReviewDrawer` 等跨端复用组件放入 `web/components/feature/` 按域组织（`health/`、`chat/`、`review/`），避免重复实现。
