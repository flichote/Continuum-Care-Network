# Continuum-Care-Network 测试报告（T5）

- 版本：v1.0
- 测试执行：QA（bookreader）
- 执行日期：2026-08-03
- 被测版本：git `988d7b6` + 本次 T5 修复（见 §5）
- 关联文档：[测试用例](test-cases.md)、[PRD](../PRD.md)
- 结论摘要：**33/33 自动化用例通过；19/19 真实服务烟测通过；前端生产构建通过。发现并修复 1 个逻辑缺陷（🔴 解绑驳回语义），另记录 2 个建议项。**

---

## 1. 执行环境

| 项 | 值 |
| --- | --- |
| OS | Windows 10（git-bash / MSYS） |
| 后端 | Python 3.12.7（backend/.venv），FastAPI 0.133.1，pytest 9.1.1，SQLAlchemy 2.0.51，aiosqlite 0.22.1 |
| 前端 | Node v22.23.1，Next.js 16.2.9，React 19.2.4，recharts 3.10.1 |
| 测试库 | SQLite 文件库（conftest 将 DATABASE_URL 指向 SQLite；开发环境 lifespan 自动建表+种子管理员） |

> ⚠️ 环境注意：本机全局 `PYTHONPATH` 指向 Hermes Agent 的 venv site-packages（其 pydantic_core 安装损坏）。运行后端测试前必须 `unset PYTHONPATH`，否则会 import 到错误的 fastapi/pydantic 并报 `ModuleNotFoundError: No module named 'pydantic_core._pydantic_core'`。这是本机环境问题，非项目代码问题。

## 2. 自动化测试执行结果（后端）

命令：

```bash
cd backend
unset PYTHONPATH
./.venv/Scripts/python.exe -m pytest -v
```

实际输出（完整末尾摘要）：

```
============================= test session starts =============================
platform win32 -- Python 3.12.7, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\zc_lizhiqian\projects\Continuum-Care-Network\backend
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.14.2, asyncio-1.4.0
collected 33 items

tests\test_access.py ..                                                  [  6%]
tests\test_auth.py .........                                             [ 33%]
tests\test_extended.py ..................                                [ 87%]
tests\test_health.py ...                                                 [ 96%]
tests\test_unbind_reject.py .                                            [100%]

============================= 33 passed in 14.19s =============================
```

用例文件与数量：

| 文件 | 用例数 | 覆盖模块 |
| --- | --- | --- |
| test_auth.py | 9 | 注册/登录/刷新/登出/改密/令牌校验/RBAC 基础 |
| test_access.py | 2 | 未绑定康复师越权访问、绑定康复师数据可见性 |
| test_extended.py | 18 | 患者档案、康复师档案与审核、匹配/解绑、计划全流程、消息、告警、阈值、管理后台 |
| test_health.py | 3 | 健康检查、OpenAPI、根路径 |
| test_unbind_reject.py | 1 | 🔴 修复回归：解绑被驳回后绑定保持生效 |

结果：**33 passed（100% 通过率，0 failed / 0 error / 0 skipped）**。

## 3. 真实服务烟测（SYS-005，uvicorn :8010 + SQLite）

命令：`uvicorn app.main:app --port 8010`（`DATABASE_URL=sqlite+aiosqlite:///smoke_ccn.db`，ENV=development），随后执行 `backend/scripts/smoke_test.py` 走完整业务链路。

实际输出（19/19 通过）：

```
PASS SYS-001 healthz {'status': 'ok', 'version': '0.1.0', 'database': 'up'}
PASS ADMIN login 200
PASS AUTH-001 register patient 201
PASS AUTH-016 users/me 200
PASS PAT-001 patient profile 200
PASS THP-002 therapist approved 200
PASS MTC-007 match approved 200
PASS HLTH-001 report spo2 201
PASS RBAC-008 therapist sees bound data 200 items=1
PASS ALR-003 therapist aggregate alerts 200 alerts=1
PASS RBAC-009 unbound access denied 403
PASS RBAC-001 patient->admin denied 403
PASS MSG-001 patient->therapist msg 201
PASS MSG-002 unread count 200 {'unread_count': 1}
PASS PLN-001 create plan 201
PASS PLN-005 checkin 201
PASS PLN-007 progress 200 {'total_tasks': 1, 'completed_tasks': 1, 'completion_rate': 100.0, ...}
PASS HLTH-008 trends 200 {'record_type': 'spo2', 'points': [{'avg': 85.0, 'min': 85.0, 'max': 85.0, 'count': 1}]}
PASS ADM-008 audit logs 200 n=5

=== SMOKE RESULT: 19/19 passed ===
```

覆盖链路：健康检查 → 管理员登录 → 患者注册 → 建档 → 康复师注册+资质提交 → 管理员审核通过 → 患者申请绑定 → 管理员批准 → 患者上报健康数据（触发告警）→ 康复师读取绑定患者数据/告警 → 越权访问被拒（未绑定患者 403 / 患者访问管理接口 403）→ 双方消息 + 未读数 → 计划创建/打卡/进度 → 趋势聚合 → 审计日志。

## 4. 检查清单逐项过

### 4.1 功能检查（对照 test-cases.md 模块）

| 模块 | 用例数 | 自动化 | 手工/走查 | 结果 |
| --- | --- | --- | --- | --- |
| 1. 认证（F1） | 17 | 9 | 8 | ✅ |
| 2. RBAC 权限（§5 权限矩阵） | 17 | 12 | 5 | ✅ |
| 3. 患者档案（F2） | 8 | 4 | 4 | ✅ |
| 4. 健康数据（F5） | 12 | 5 | 7 | ✅ |
| 5. 康复师档案与审核（F3） | 7 | 3 | 4 | ✅ |
| 6. 对接/匹配（F4） | 14 | 5 | 9 | ✅ |
| 7. 康复计划（F6） | 11 | 5 | 6 | ✅ |
| 8. 消息（F7） | 8 | 4 | 4 | ✅ |
| 9. 告警（F8） | 10 | 5 | 5 | ✅ |
| 10. 管理后台（F9） | 8 | 4 | 4 | ✅ |
| 11. 系统与兼容性 | 8 | 3 | 5 | ✅ |

（注：手工用例按接口契约与依赖注入代码走查核验，未逐一实跑；自动化用例全部实跑通过。）

### 4.2 权限检查（RBAC 重点抽查）

| 场景 | 期望 | 实测 | 证据 |
| --- | --- | --- | --- |
| 患者访问 /admin/statistics | 403 | 403 | smoke RBAC-001 |
| 未绑定康复师查他人健康数据 | 403 | 403 | smoke RBAC-009 / test_access |
| 绑定康复师查患者数据 | 200 | 200 | smoke RBAC-008 |
| 患者越权查他人数据 | 仅本人数据 | 仅本人数据 | test_extended::test_health_records_only_self_for_patient |
| 康复师仅能为绑定患者建计划 | 403 | 403 | test_extended::test_plan_full_flow |
| 跨关系/给自己/管理员发消息 | 403/400/403 | 通过 | test_extended::test_message_rbac_cross_relation_denied |
| 患者处理告警 | 403 | 403 | test_extended::test_alert_thresholds_and_handle |
| 解绑后权限即时回收 | 403 | 403 | test_extended::test_match_request_duplicate_and_unbind_flow |
| 停用用户登录 | 403 | 403 | test_extended::test_admin_user_status_and_stats |

### 4.3 前端构建（SYS-004）

命令：`cd frontend && npm run build`。实际输出（摘要）：

```
✓ Generating static pages using 19 workers (27/27) in 312ms
Route (app)
┌ ○ /            ├ ○ /403        ├ ○ /admin      ├ ○ /admin/audit
├ ○ /admin/reviews/matchings  ├ ○ /admin/reviews/therapists  ├ ○ /admin/thresholds
├ ○ /admin/users ├ ○ /forgot-password ├ ○ /login  ├ ○ /onboarding/patient
├ ○ /onboarding/therapist ├ ○ /patient ├ ○ /patient/health ├ ○ /patient/messages
├ ○ /patient/plans ├ ○ /patient/profile ├ ○ /patient/therapist ├ ○ /register
├ ○ /therapist ├ ○ /therapist/dashboard ├ ○ /therapist/messages
├ ƒ /therapist/patients/[id] ├ ƒ /therapist/patients/[id]/plan └ ○ /therapist/profile
ƒ Proxy (Middleware)
```

结果：✅ 生产构建通过，27 个页面路由 + proxy 中间件全部生成成功，无 TypeScript/编译错误。

### 4.4 前端-后端联调（SYS-005）

- 后端以真实 uvicorn 服务运行（见 §3），前端为纯客户端渲染（`use client`），API 基址 `http://localhost:8000/api/v1`。
- 通过真实 HTTP 请求完成 登录→上报→告警→消息→计划 全链路（19/19 通过，见 §3），无 500 错误。
- 未起浏览器做 UI 冒烟（headless 环境），UI 层行为以 proxy 守卫代码走查 + 构建验证替代，见 §4.5 与风险项 R2。

### 4.5 API 路径对齐（SYS-008）

前端 `lib/api.ts` 封装统一 `apiFetch`（自动附加 JWT、401 自动 refresh 重试），调用路径与后端 `app/api/v1/*` 路由逐条核对：

| 前端调用 | 后端路由 | 匹配 |
| --- | --- | --- |
| /admin/audit-logs, /admin/matches, /admin/statistics, /admin/therapists, /admin/thresholds, /admin/users | admin.py 全部路由 | ✅ |
| /alerts | alerts.py | ✅ |
| /health/records, /health/trends | health.py | ✅ |
| /matches | matching.py | ✅ |
| /messages, /messages/conversations | messages.py | ✅ |
| /patients, /patients/{id} | patients.py | ✅ |
| /plans, /plans/{id}, /plans/{id}/tasks, /plans/{id}/progress | plans.py | ✅ |
| /therapists | therapists.py | ✅ |

结果：✅ 全部命中，未发现 404 路径（SYS-008 PASS）。

### 4.6 路由守卫走查（SYS-006/007）

`frontend/proxy.ts`（Next.js 16 proxy 替代 middleware）：
- 未登录访问 /patient、/therapist、/admin、/onboarding → 重定向 /login?next=...（SYS-006 ✅）
- 角色 cookie 与路由前缀不符 → 重定向 /403（SYS-007 ✅）
- 已登录访问 /login 等 → 回角色首页（✅）
- 设计说明：JWT 存 localStorage，proxy 无法读取，角色 cookie 仅做体验级跳转；真正安全边界由后端 API 401/403 + 客户端 `RequireRole` 组件兜底（与 T4 决策一致，符合该架构下的预期行为）。

## 5. 发现的问题

### 🔴 已修复（阻塞级）— 解绑驳回导致绑定被终止

- **现象**：管理员对 `pending_unbind` 状态的绑定执行 `approve:false`（驳回解绑申请）时，`review_match` 原逻辑走 `else` 分支：`TERMINATED if match.status == PENDING_UNBIND else REJECTED`，把绑定置为 `terminated`，直接销毁了本应保留的绑定关系，与 PRD「驳回解绑 → 绑定保持生效」语义相反。
- **影响范围**：MTC-014 场景；若生产发生，患者-康复师绑定被误拆，权限随之回收，属数据一致性破坏。
- **修复**：`backend/app/api/v1/admin.py:249-251`，新增 `elif match.status == PENDING_UNBIND: status = APPROVED`，驳回解绑时回到生效状态。
- **回归测试**：新增 `backend/tests/test_unbind_reject.py::test_reject_unbind_keeps_binding_approved`（解绑→驳回→断言 status=approved→康复师仍可读取患者数据），已随全套 33 用例通过。

### 🟡 建议（应当修）

1. **测试环境 PYTHONPATH 污染易踩坑**：本机全局 PYTHONPATH 含 Hermes Agent 的 site-packages（pydantic_core 损坏），`python -m pytest` 会被其劫持。建议在 `backend/README` 或 pytest 入口说明中注明 `unset PYTHONPATH`（本次报告已记录，未改代码，属环境问题）。
2. **数据库锁清理靠重试兜底**：`conftest.py` 对 Windows + aiosqlite 文件句柄延迟释放做了 5 次重试；若第 5 次仍失败会静默留下 `test_ccn.db`（gitignored）。建议后续迁移到 `tmp_path` 或内存库（`sqlite+aiosqlite:///:memory:` + StaticPool），彻底避免文件锁问题。

### ⚪ 疑问（需澄清）

1. **管理员不参与计划**（RBAC-012 预期 403）：PRD 权限矩阵中管理员未列计划模块，当前 `get_plan` 对非患者/非绑定康复师返回 403，符合矩阵，但前端管理端无计划页面，未见矛盾；待产品确认管理员是否需要只读查看。
2. **解绑驳回后状态机**：当前驳回解绑直接回到 `approved`，无新的 audit 字段区分「曾被驳回解绑」。审计日志 `admin.match_review` 已记录 approve=false + 状态，可追溯；如需历史留痕可在 Match 上加 `unbind_rejected_at` 等字段（非必需）。

## 6. 风险项

| 编号 | 风险 | 等级 | 说明 |
| --- | --- | --- | --- |
| R1 | 自动化测试使用 SQLite，生产为 PostgreSQL | 中 | conftest 明确将 DATABASE_URL 指向 SQLite；SQLite 与 PG 在 JSON/时间序列/并发语义上有差异。建议在 CI 增加 PostgreSQL 服务跑同一套用例（docker-compose 已含 db 服务，见 docs/ops/deploy.md）。 |
| R2 | UI 冒烟未执行 | 中 | headless 环境未启动浏览器逐页点击；以构建通过 + proxy 代码走查 + 真实 API 链路替代。建议交付前人工按 test-cases.md 手工用例抽检关键页面。 |
| R3 | 前端 27 页面含 4 个动态路由（ƒ） | 低 | 动态路由在运行时请求后端，build 阶段无法预渲染；已在 T4 构建验证，联调链路（§3）覆盖核心数据读取。 |
| R4 | 手工用例未逐条实跑 | 低 | 手工标注的用例以代码走查 + 契约核对为主；边界值（如 HLTH-005 临界合法值）建议后续在集成环境补跑。 |

## 7. 交付物清单

- `docs/qa/test-cases.md` — 测试用例文档（v1.0，含本次 PLN-007 契约字段修正）
- `docs/qa/test-report.md` — 本报告
- `backend/tests/test_extended.py` — 新增 18 条扩展自动化用例
- `backend/tests/test_unbind_reject.py` — 新增解绑驳回回归用例
- `backend/tests/conftest.py` — Windows aiosqlite 文件锁重试修复
- `backend/app/api/v1/admin.py` — 🔴 解绑驳回语义修复
- `backend/scripts/smoke_test.py` — 真实服务烟测脚本（19 项检查）

## 8. 验收结论

- ✅ 后端自动化：33/33 通过
- ✅ 真实服务烟测：19/19 通过
- ✅ 前端生产构建：通过（27 路由）
- ✅ API 路径对齐 / 路由守卫：代码走查通过
- ✅ 🔴 阻塞问题：已修复并加回归测试
- 🟡 建议项 / ⚪ 疑问项：均已记录，不阻塞交付

**结论：T5 测试验证完成，可进入下一阶段（T6 已先行，部署/监控文档见 docs/ops/）。**
