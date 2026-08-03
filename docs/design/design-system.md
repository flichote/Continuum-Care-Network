# Continuum-Care-Network 设计系统（Design System）

- 版本：v0.1（初始规划）
- 状态：已确认（与 T1 PRD / tech-stack 对齐，可直接指导前端实现）
- 技术基座：Next.js App Router + Tailwind CSS + shadcn/ui 风格组件
- 更新日期：2026-08-03

> 本文档是 UI 的**唯一事实来源**。所有页面（见 `pages.md`）与页面组件（见 `components.md`）必须引用本文档中的 token，禁止在页面中硬编码设计值。

---

## 1. 设计理念

**关键词**：专业、安心、温暖、可信。

- **专业与可信**：以蓝绿色系（teal / 青绿）为品牌主色，传递医疗健康场景的专业、冷静与信任感。
- **温暖与人文**：以暖橙色为功能强调色（行动按钮、高亮），避免冷冰冰的"纯医院感"。
- **危险与告警**：告警、错误、破坏性操作统一使用红色系，语义一目了然。
- **克制与清晰**：大面积留白、低饱和中性色背景、圆角柔和；信息密度适中，照顾中老年患者人群的可读性。

---

## 2. 色彩（Color）

### 2.1 品牌色（Primary — 蓝绿 / Teal）

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--primary-50` | `#EFFCF9` | 主色浅底（选中背景、Tag 底色、图表网格） |
| `--primary-100` | `#D6F5EC` | 浅色底（信息卡片、hover 背景） |
| `--primary-200` | `#B0E8DA` | 描边、图表浅色系 |
| `--primary-500` | `#14B8A6` | 次级强调（链接、图标、进度条） |
| `--primary-600` | `#0D9488` | **主行动色**：主按钮、选中态、活跃导航 |
| `--primary-700` | `#0F766E` | 主按钮 hover、按压态 |
| `--primary-800` | `#115E59` | 深色强调（页头标题、强调文本） |

对应 Tailwind 映射：`primary-50/100/200/500/600/700/800`。

### 2.2 强调色（Accent — 暖橙）

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--accent-100` | `#FFF3E0` | 暖色浅底（欢迎横幅、特写卡片底） |
| `--accent-400` | `#FB923C` | 高亮、星标、打卡完成动画 |
| `--accent-500` | `#F97316` | **强调行动**：打卡按钮、重要 CTA、醒目标签 |

### 2.3 语义色（Semantic）

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--success-500` | `#22C55E` | 成功、正常指标、已通过 |
| `--success-600` | `#16A34A` | 成功态深色文本 |
| `--warning-100` | `#FEF3C7` | 告警浅底 |
| `--warning-500` | `#F59E0B` | 待审核、中等风险、一般告警 |
| `--danger-100` | `#FEE2E2` | 危险浅底 |
| `--danger-500` | `#EF4444` | 错误、危险、紧急告警、删除 |
| `--danger-600` | `#DC2626` | 危险深色（hover、深色文本） |
| `--info-500` | `#3B82F6` | 信息提示、进行中状态 |

### 2.4 中性色（Neutral / Slate）

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--neutral-0` | `#FFFFFF` | 页面底色、卡片底 |
| `--neutral-50` | `#F8FAFC` | 页面底色（浅灰）、表格斑马纹 |
| `--neutral-100` | `#F1F5F9` | 卡片 hover 底、输入框底 |
| `--neutral-200` | `#E2E8F0` | 描边、分割线、输入框边框 |
| `--neutral-300` | `#CBD5E1` | 弱描边、占位图标 |
| `--neutral-400` | `#94A3B8` | 禁用态文字、辅助图标 |
| `--neutral-500` | `#64748B` | 次要文本、说明文字 |
| `--neutral-600` | `#475569` | 正文辅助色 |
| `--neutral-700` | `#334155` | 正文主色 |
| `--neutral-800` | `#1E293B` | 标题主色 |
| `--neutral-900` | `#0F172A` | 深色文本（强调标题） |

### 2.5 图表色板（Chart）

健康数据趋势、统计图表统一使用以下序列（按序循环）：

| 序号 | 色值 | 对应指标 |
| --- | --- | --- |
| 1 | `#0D9488`（primary-600） | 血压/主指标 |
| 2 | `#F97316`（accent-500） | 心率 |
| 3 | `#3B82F6`（info-500） | 体温 |
| 4 | `#8B5CF6`（violet-500） | 血氧 SpO2 |
| 5 | `#22C55E`（success-500） | 正常区间/完成率 |

### 2.6 无障碍对比度要求

- 正文文本与背景对比度 ≥ **4.5:1**（WCAG AA）。
- 大号文本（≥18pt/24px）与图形元素对比度 ≥ **3:1**。
- 主按钮 `primary-600` + 白字对比度约为 4.0:1，**按钮内文字使用 16px 以上加粗**以满足大文本 3:1 要求；若需严格 AA，可对主按钮 hover 使用 `primary-700`。
- 纯色不可作为唯一信息通道，必须搭配图标/文字标签（如告警级别）。

---

## 3. 字体（Typography）

### 3.1 字体族

```css
--font-sans: "Inter", "PingFang SC", "Hiragino Sans GB",
             "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
```

- 拉丁字符使用 Inter，中文回退到系统中文字体（PingFang SC / Microsoft YaHei / Noto Sans SC）。
- 数字（健康指标、统计数据）建议使用 tabular-nums（等宽数字），保证图表与表格对齐稳定。

### 3.2 字号与行高（Type Scale）

| Token | 字号 | 行高 | 字重 | 用途 |
| --- | --- | --- | --- | --- |
| `text-xs` | 12px | 16px | 400/500 | 辅助说明、时间戳、表格次要列 |
| `text-sm` | 14px | 20px | 400/500 | 正文次要、表单标签、按钮文字 |
| `text-base` | 16px | 24px | 400/500 | **正文默认**、卡片内容 |
| `text-lg` | 18px | 28px | 500/600 | 卡片标题、列表项标题 |
| `text-xl` | 20px | 28px | 600 | 区块标题 |
| `text-2xl` | 24px | 32px | 600 | 页面标题 |
| `text-3xl` | 30px | 36px | 700 | 数据大数字（仪表盘） |
| `text-4xl` | 36px | 44px | 700 | 登录页品牌标语（慎用） |

### 3.3 数字展示

健康指标大数字（血压、心率等）使用 `text-3xl` + `font-bold` + `tabular-nums`，单位使用 `text-sm` + `neutral-500`。

---

## 4. 间距（Spacing）

基于 4px 网格：

| Token | 值 | 用途 |
| --- | --- | --- |
| `space-1` | 4px | 图标与文字间距、紧凑内边距 |
| `space-2` | 8px | 组件内元素间距、Tag 内边距 |
| `space-3` | 12px | 表单控件内边距、卡片内容间距 |
| `space-4` | 16px | **标准间距**：卡片内边距、列表间距 |
| `space-5` | 20px | 区块内边距 |
| `space-6` | 24px | 卡片间间距、区块间距 |
| `space-8` | 32px | 大区块间距、页面 section 间距 |
| `space-10` | 40px | 页面主间距 |
| `space-12` | 48px | 页面最大间距（页头与内容之间） |

布局约束：

- 页面内容区最大宽度 **1200px**，左右留白 ≥ 24px（移动端 ≥ 16px）。
- 卡片网格间距统一 `space-6`（24px）。
- 表单字段纵向间距 `space-5`（20px）。

---

## 5. 圆角（Radius）

| Token | 值 | 用途 |
| --- | --- | --- |
| `rounded-sm` | 6px | 输入框、小按钮、Tag |
| `rounded-md` | 10px | 卡片、表格、中等按钮、图表容器 |
| `rounded-lg` | 14px | 大卡片、弹窗、对话框 |
| `rounded-full` | 9999px | 头像、药丸按钮、数字徽标 |

---

## 6. 阴影（Shadow）

| Token | 值 | 用途 |
| --- | --- | --- |
| `shadow-sm` | `0 1px 2px rgba(15, 23, 42, 0.06)` | 悬浮卡片默认态、输入框 |
| `shadow-md` | `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)` | 卡片 hover、下拉面板 |
| `shadow-lg` | `0 10px 15px -3px rgba(15, 23, 42, 0.10), 0 4px 6px -4px rgba(15, 23, 42, 0.08)` | 弹窗、抽屉、悬浮操作条 |

---

## 7. 通用组件规范

> 页面级组件清单与布局见 `components.md`。此处定义**基础组件**的设计契约。

### 7.1 按钮（Button）

| 变体 | 背景 | 文字 | 边框 | 用途 |
| --- | --- | --- | --- | --- |
| `primary` | primary-600 | 白 | 无 | 主行动（提交、上报、保存） |
| `secondary` | primary-50 | primary-700 | 无 | 次行动（导出、查看） |
| `outline` | 透明 | neutral-700 | neutral-300 | 次级行动（取消、取消选择） |
| `ghost` | 透明 | primary-600 | 无 | 弱行动（更多、编辑链接） |
| `danger` | danger-500 | 白 | 无 | 破坏性操作（删除、驳回） |
| `disabled` | neutral-100 | neutral-400 | 无 | 禁用（不可交互） |

- 尺寸：`sm` 高 32px（`h-8`）；`md` 高 40px（`h-10`，默认）；`lg` 高 48px（`h-12`，移动端主 CTA）。
- 圆角：`rounded-sm`（10px → 6px，按尺寸取 `rounded-sm`）。
- 内边距：`px-4`（md），图标按钮 `w-10 h-10` 方形。
- 状态：hover 加深（primary→primary-700）、active 按压位移 1px、focus 使用 2px `primary-200` 外环（`ring-2 ring-primary-200 ring-offset-2`）、loading 显示 spinner 并禁用点击。
- 移动端底部常驻主按钮（如上报）使用 `fixed bottom-0 inset-x-0` 容器，按钮圆角改为 `rounded-none`（全宽吸底）。

### 7.2 表单（Form / Input）

- 标签：`text-sm` + `neutral-700`，标签与控件间距 `space-2`，必填项标签前加红色 `*`。
- 输入框：高度 40px（`h-10`），`rounded-sm`，边框 `neutral-200`，背景白，focus 时边框 `primary-500` + `ring-2 ring-primary-100`。
- 占位符：`neutral-400`。
- 校验错误：错误文案 `text-sm` + `danger-600`，显示在字段下方，输入框边框变 `danger-500`；同时可加 `aria-invalid="true"` 与错误提示 `role="alert"`。
- 帮助文案：`text-xs` + `neutral-500`。
- 选择器：下拉（Select）与单/多选框统一用 shadcn/ui 风格，选中项使用 primary-600。
- 数字输入（健康指标）：带单位后缀（如 mmHg、次/分、°C、%），右侧单位 `neutral-400`，输入框 `inputMode="decimal"`。
- 上传（资质材料、出院小结）：拖拽或点击上传区（dashed 边框 `neutral-300`，hover primary-500），支持预览、删除；文件卡片显示文件名 + 大小 + 上传状态。

### 7.3 卡片（Card）

- 结构：`bg-white rounded-md border border-neutral-200 shadow-sm`。
- 头部：`px-4 py-3`，标题 `text-lg font-semibold`，右侧可放操作链接（ghost 按钮）。
- 内容：`p-4`（或 `px-4 py-3`），内容间距 `space-3`。
- hover 状态（可点击卡片）：`shadow-md` + 边框 `primary-200`。
- 选中状态：边框 `primary-500` + 左侧 3px primary-500 指示条。

### 7.4 表格（Table）

- 容器：`bg-white rounded-md border border-neutral-200`，内容区 `overflow-x-auto`。
- 表头：`bg-neutral-50`，`text-sm font-medium text-neutral-600`，`px-4 py-3` 左对齐。
- 单元格：`px-4 py-3 text-sm text-neutral-700`。
- 行分隔：`border-t border-neutral-100`；斑马纹可选 `odd:bg-white even:bg-neutral-50/50`。
- 行 hover：`hover:bg-primary-50/50`。
- 状态列：使用状态徽标（见 7.6）。
- 空态：居中插画图标 + `text-neutral-400` 文案 + 可选行动按钮。
- 分页：底部居右，`text-sm`，当前页高亮 primary-600。

### 7.5 图表（Chart）

- 图例：`text-sm text-neutral-600`，色点 8px 圆。
- 坐标轴：`neutral-400` 刻度文字 12px。
- 网格线：`neutral-100`，虚线可选。
- 折线：2px 圆角，节点圆点 4px，hover 显示 tooltip（白底、`shadow-lg`、`rounded-sm`、12px 文字）。
- 参考区间：血压/心率等可画参考区间带（`primary-100` 半透明填充），越界数据点用 `danger-500` 标注。
- 图表容器高度：趋势图 ≥ 240px，看板大图 ≥ 320px。

### 7.6 状态徽标（Badge / Status）

| 状态 | 底色 | 文字色 | 适用场景 |
| --- | --- | --- | --- |
| `pending` 待审核 | warning-100 | warning-500（深可 warning-700） | 资质待审、绑定待审 |
| `approved` 已通过 | success-100（#DCFCE7） | success-600 | 资质通过、绑定成功 |
| `rejected` 已驳回 | danger-100 | danger-600 | 资质驳回、解绑完成 |
| `active` 生效中 | primary-50 | primary-700 | 绑定生效中、计划进行中 |
| `completed` 已完成 | success-100 | success-600 | 计划完成、打卡完成 |
| `normal` 正常 | neutral-100 | neutral-600 | 指标正常 |
| `warning` 关注 | warning-100 | warning-700 | 指标越界但非紧急 |
| `critical` 紧急 | danger-100 | danger-600 | 紧急告警、异常指标 |
| `unbound` 未绑定 | neutral-100 | neutral-500 | 未匹配状态 |

样式：`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium`，可带 6px 状态圆点。

### 7.7 告警提示（Alert）

- 位置：页面顶部（页面级）或卡片内（局部），置于相关区块上方。
- 变体：`info`（info-100 底 / info-600 图标）、`warning`（warning-100 / warning-600）、`danger`（danger-100 / danger-600）、`success`（success-100 / success-600）。
- 结构：图标 + 标题（`text-sm font-semibold`）+ 正文（`text-sm`），可关闭（×按钮），`rounded-md p-4`。
- 紧急告警（critical）额外使用 `border-l-4 border-danger-500` 强调。

### 7.8 导航（Navigation）

- 桌面端：左侧固定侧边栏（宽度 240px），`bg-white border-r border-neutral-200`；导航项高 40px，`rounded-sm`，hover `bg-neutral-100`，激活态 `bg-primary-50 text-primary-700 font-medium` + 左侧 3px primary-600 指示条。
- 顶部栏：品牌 Logo（左）+ 搜索（中，可选）+ 通知铃铛（带未读红点徽标）+ 用户头像菜单（右），`h-16 bg-white border-b border-neutral-200`。
- 移动端：底部 Tab 导航（首页 / 数据 / 消息 / 我的），高 56px，激活项 primary-600 图标+文字；侧边栏收起为抽屉（Drawer）。
- 未读提醒：铃铛与消息入口显示红色数字徽标（`bg-danger-500 text-white rounded-full text-xs`），数字 >99 显示 "99+"。

### 7.9 弹窗与抽屉（Modal / Drawer）

- 弹窗：`rounded-lg shadow-lg`，宽 480px（表单类）或 640px（详情类），遮罩 `bg-neutral-900/50`，关闭按钮右上。
- 抽屉（移动端导航 / 筛选）：从右侧滑入，宽 320px，遮罩同上。
- 确认框：标题 + 说明 + 危险操作需红字确认按钮。

### 7.10 空态 / 加载态 / 错误态

- 空态（Empty）：居中插画 + `text-base text-neutral-400` 文案 + 行动按钮（可选）。
- 加载态（Skeleton）：使用 `animate-pulse bg-neutral-100 rounded-sm` 占位块，形状与真实内容一致；首屏加载必须有 Skeleton，禁止白屏。
- 错误态：页面级 Alert（danger）+ 重试按钮。
- 首屏路由加载：顶部细进度条（primary-500）。

---

## 8. 动效（Motion）

- 时长：微交互 150ms；面板/抽屉 200ms；页面过渡 200ms。
- 缓动：`cubic-bezier(0.4, 0, 0.2, 1)`（默认 ease-in-out）。
- 用途：hover 反馈（背景/阴影变化）、卡片入场（fade + translateY 8px）、告警出现（从顶部滑入）。
- 遵循系统"减少动态效果"偏好（`prefers-reduced-motion: reduce` 时禁用动画）。
- 避免大面积闪烁；打卡成功可轻量放大-回弹一次（300ms）。

---

## 9. 图标与品牌

- 图标库：Lucide（shadcn/ui 默认），stroke=2，尺寸 16/20/24px 三档。
- 品牌标识：暂用文字 Logo「延续康护」+ 图标（绿叶/心形 + 连接线，可在 M4 前由设计补充）。
- 登录页背景：primary-50 到白渐变 + 抽象曲线（可用 SVG 装饰），传达"连续、流动"。

---

## 10. Tailwind 接入说明（开发指引）

1. 在 `tailwind.config.ts` 中注册 `primary`/`accent`/`danger`/`warning`/`info`/`success` 色阶与 `font-sans`，或在 `globals.css` 以 CSS 变量 + `hsl()` 方式暴露（shadcn/ui 惯例），本设计系统色值为 hex，转 HSL 时保留语义命名。
2. 所有组件使用 token（`bg-primary-600`、`text-neutral-700`、`rounded-md`、`shadow-md`），禁止在组件中直接写十六进制。
3. 通用组件（Button/Input/Card/Table/Badge/Alert/Modal 等）封装为 shadcn/ui 风格可复用组件，放 `web/components/ui/`，页面组件放 `web/components/`。
4. 页面布局组件（Sidebar、Topbar、MobileTabBar）抽为 `web/components/layout/`，在各角色布局路由中使用。

---

## 11. 设计原则（Do / Don't）

**Do：**
- 主行动每屏只有一个，使用 primary-600。
- 健康指标强调"数字可读性"：大数字 + 单位 + 参考区间。
- 告警信息同时用颜色 + 图标 + 文字表达。
- 表单提供明确校验反馈与成功反馈（toast / 内联提示）。
- 考虑低视力与老年人：正文 ≥ 14px，点击目标 ≥ 40px。

**Don't：**
- 不使用纯红/纯绿表达"好坏"而缺少文字。
- 不把多个 primary 按钮并排放置（只保留一个主行动）。
- 不在移动端使用过小的点击区域（< 40px）。
- 不滥用阴影与圆角（卡片一层阴影即可）。
- 不在图表中同时使用超过 5 种色。
