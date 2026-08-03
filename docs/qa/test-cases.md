# Continuum-Care-Network 测试用例文档（T5）

- 版本：v1.0
- 维护者：QA（bookreader）
- 更新日期：2026-08-03
- 关联需求：[docs/PRD.md](../PRD.md)
- 用例优先级：P0 = 阻塞级（必须通过）/ P1 = 高（核心流程）/ P2 = 中（常规）/ P3 = 低（边缘）

> 执行说明：后端用例已实现为 `backend/tests/test_auth.py`、`test_access.py`、`test_extended.py`、`test_unbind_reject.py`，
> 共 33 条自动化用例，全部可复现（`cd backend && pytest`）。本文件为需求-用例映射与手工用例补充。

---

## 1. 认证模块（PRD F1）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | 注册成功（患者） | POST /auth/register {phone, password, full_name, role=patient} | 201，返回 access+refresh token；自动创建患者档案 | P0 | test_auth::test_register_and_login_roundtrip |
| AUTH-002 | 注册成功（康复师） | role=therapist 注册 | 201，返回 token；康复师档案状态为 pending | P0 | test_auth::test_therapist_register_creates_pending_profile |
| AUTH-003 | 注册-弱密码拒绝 | password="short" / "onlyletters" / "12345678" | 422（长度≥8 且含字母数字） | P0 | test_auth::test_weak_password_rejected |
| AUTH-004 | 注册-重复手机号 | 同一手机号注册两次 | 第二次 409 | P0 | test_auth::test_duplicate_phone_rejected |
| AUTH-005 | 注册-手机号邮箱均缺失 | 只传 password/full_name | 422 | P1 | 手工 |
| AUTH-006 | 登录成功 | POST /auth/login {account=phone, password} | 200，返回新 token 对 | P0 | test_auth::test_register_and_login_roundtrip |
| AUTH-007 | 登录-邮箱账号 | 用注册邮箱登录 | 200 | P1 | 手工 |
| AUTH-008 | 登录-密码错误 | 错误密码 | 401 | P0 | test_auth::test_login_wrong_password |
| AUTH-009 | 登录-账号不存在 | 未注册账号 | 401（不区分账号不存在/密码错误） | P1 | 手工 |
| AUTH-010 | 登录-停用账号 | 管理员停用后登录 | 403「账号已被停用」 | P1 | test_extended::test_admin_user_status_and_stats |
| AUTH-011 | 令牌刷新 | POST /auth/refresh {refresh_token} | 200，新 access+refresh；旧 refresh 作废（轮换） | P0 | test_auth::test_refresh_and_logout |
| AUTH-012 | 刷新-旧 token 重放 | 用已轮换的 refresh 再刷 | 401 | P0 | test_auth::test_refresh_and_logout |
| AUTH-013 | 登出 | POST /auth/logout {refresh_token} | 204；该 refresh 失效 | P1 | test_auth::test_refresh_and_logout |
| AUTH-014 | 修改密码 | POST /users/me/change-password（验证旧密码） | 204；旧密码失效、新密码可登录 | P1 | test_auth::test_change_password |
| AUTH-015 | 修改密码-旧密码错误 | 错误 old_password | 400 | P1 | 手工 |
| AUTH-016 | 无令牌访问受保护接口 | GET /users/me | 401 | P0 | test_auth::test_protected_route_requires_token |
| AUTH-017 | 伪造/过期令牌 | 篡改 access token | 401 | P1 | 手工 |

## 2. RBAC 权限（PRD §5 权限矩阵）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| RBAC-001 | 患者访问管理员接口 | GET /admin/statistics | 403 | P0 | test_auth::test_rbac_patient_cannot_access_admin |
| RBAC-002 | 非管理员访问管理全部接口 | /admin/users、/admin/matches、/admin/thresholds、/admin/audit-logs、/admin/therapists | 全部 403 | P0 | test_extended::test_admin_rbac_denied_for_non_admin |
| RBAC-003 | 康复师无法维护患者档案 | PUT /users/me/patient-profile（康复师 token） | 403 | P1 | test_extended::test_patient_profile_requires_patient_role |
| RBAC-004 | 患者无法创建康复师档案 | PUT /users/me/therapist-profile（患者 token） | 403 | P1 | 手工 |
| RBAC-005 | 非患者上报健康数据 | 康复师 POST /health/records | 403 | P1 | 手工（require_roles(PATIENT)） |
| RBAC-006 | 患者无法为他人制定计划 | 患者 PATCH /plans/{id} | 403 | P1 | test_extended::test_plan_full_flow |
| RBAC-007 | 康复师仅能为绑定患者制定计划 | 对未绑定患者 POST /plans | 403 | P0 | test_extended::test_plan_full_flow |
| RBAC-008 | 未绑定康复师访问患者档案 | GET /patients/{other_id} | 403 | P0 | test_access::test_unbound_therapist_cannot_access_other_patient |
| RBAC-009 | 未绑定康复师查询患者健康数据 | GET /health/records?patient_id=other | 403 | P0 | test_access::test_unbound_therapist_cannot_access_other_patient |
| RBAC-010 | 患者越权查询他人健康数据 | GET /health/records?patient_id=other | 仅返回本人数据（参数被忽略，无数据泄漏） | P1 | test_extended::test_health_records_only_self_for_patient |
| RBAC-011 | 患者查看他人计划 | GET /plans/{other_plan_id} | 403 | P1 | 手工（代码 get_plan 校验） |
| RBAC-012 | 管理员查看计划详情 | GET /plans/{id}（admin） | 403（按权限矩阵管理员不参与计划） | P2 | 手工 |
| RBAC-013 | 跨关系发消息 | 康复师给未绑定患者发消息 | 403 | P0 | test_extended::test_message_rbac_cross_relation_denied |
| RBAC-014 | 给自己发消息 | recipient_id = 自己 | 400 | P2 | test_extended::test_message_rbac_cross_relation_denied |
| RBAC-015 | 管理员发消息 | admin 调 POST /messages | 403 | P2 | test_extended::test_message_rbac_cross_relation_denied |
| RBAC-016 | 患者处理告警 | PATCH /alerts/{id}/handle（患者） | 403 | P1 | test_extended::test_alert_thresholds_and_handle |
| RBAC-017 | 解绑后权限即时回收 | 解绑生效后康复师查询该患者健康数据 | 403 | P0 | test_extended::test_match_request_duplicate_and_unbind_flow |

## 3. 患者档案（PRD F2）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| PAT-001 | 建档/更新本人档案 | PUT /users/me/patient-profile（性别/生日/紧急联系人/病史/过敏史等） | 200，字段持久化 | P0 | test_extended::test_patient_profile_upsert_and_self_view |
| PAT-002 | 查看本人档案 | GET /users/me/patient-profile | 200，含紧急联系人等敏感字段 | P0 | test_extended::test_patient_profile_upsert_and_self_view |
| PAT-003 | 更新基础用户信息 | PATCH /users/me {full_name} | 200 生效 | P1 | test_extended::test_patient_profile_upsert_and_self_view |
| PAT-004 | 修改手机号-被占用 | PATCH /users/me {phone=他人手机号} | 409 | P1 | 手工 |
| PAT-005 | 绑定康复师查看患者档案 | GET /patients/{id}（绑定康复师） | 200，脱敏视图：不含紧急联系人（F2.4） | P0 | test_extended::test_self_patient_profile_not_in_therapist_view |
| PAT-006 | 患者本人/管理员查看全量档案 | GET /patients/{id}（本人或 admin） | 200 含敏感字段 | P1 | 手工 |
| PAT-007 | 查看不存在的患者 | GET /patients/{uuid} | 404 | P2 | 手工 |
| PAT-008 | 康复师列表（患者浏览） | GET /therapists | 200，仅返回已审核通过康复师 | P1 | test_extended::test_therapist_reject_requires_reason |

## 4. 健康数据（PRD F5）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| HLTH-001 | 上报血压 | POST /health/records {blood_pressure, systolic, diastolic} | 201，unit=mmHg | P0 | test_access::test_therapist_sees_bound_patient_alerts_and_health |
| HLTH-002 | 上报单项指标 | heart_rate / temperature / spo2 / blood_glucose / weight | 201 | P1 | test_extended::test_health_record_range_validation |
| HLTH-003 | 边界值校验-超上限 | temperature=50 / spo2=20 / systolic=300 | 422 | P0 | test_extended::test_health_record_range_validation |
| HLTH-004 | 边界值校验-缺字段 | 血压缺 diastolic；心率缺 value | 422 | P0 | test_extended::test_health_record_range_validation |
| HLTH-005 | 边界值-临界合法 | 体温 30.0 / 45.0，SpO2 50 / 100 | 201（闭区间合法） | P2 | 手工 |
| HLTH-006 | 历史记录分页 | GET /health/records?page&size | 200，total/page/size/items | P1 | 手工（代码 HealthRecordPage） |
| HLTH-007 | 时间范围过滤 | GET /health/records?from&to | 只返回区间内记录 | P2 | 手工 |
| HLTH-008 | 趋势聚合 | GET /health/trends?record_type=heart_rate&days=7 | avg/min/max/count 正确（60/80/100 → 80/60/100，count=3） | P1 | test_extended::test_health_trends_aggregation |
| HLTH-009 | 趋势-非法指标 | record_type=xyz | 422 | P2 | test_extended::test_health_trends_aggregation |
| HLTH-010 | 趋势-血压双字段 | blood_pressure 趋势 | 每天 systolic+diastolic 各一个点（按字段顺序输出） | P2 | 手工 |
| HLTH-011 | 单条记录详情 | GET /health/records/{id}（本人/绑定康复师） | 200 | P2 | 手工 |
| HLTH-012 | 记录详情越权 | 他人读取记录 | 403 | P1 | 手工（ensure_patient_access） |

## 5. 康复师档案与审核（PRD F3）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| THP-001 | 提交资质 | PUT /users/me/therapist-profile | 200，status=pending | P0 | test_extended::test_therapist_profile_edit_resets_to_pending |
| THP-002 | 管理员审核通过 | POST /admin/therapists/{id}/review {approve:true} | 200，status=approved | P0 | test_extended::test_therapist_profile_edit_resets_to_pending |
| THP-003 | 管理员审核驳回-无原因 | approve:false + 空 note | 422「驳回必须填写原因」 | P1 | test_extended::test_therapist_reject_requires_reason |
| THP-004 | 管理员审核驳回-有原因 | approve:false + note | 200，status=rejected；不再出现在公开列表 | P1 | test_extended::test_therapist_reject_requires_reason |
| THP-005 | 资质修改后重新审核 | 审核通过后改 license_number | status 重置为 pending | P1 | test_extended::test_therapist_profile_edit_resets_to_pending |
| THP-006 | 患者查看绑定康复师档案 | GET /therapists/{id}（绑定患者） | 200 | P1 | 手工 |
| THP-007 | 未绑定用户查看康复师详情 | GET /therapists/{id}（未绑定患者） | 403 | P1 | 手工（代码校验） |

## 6. 对接/匹配（PRD F4）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| MTC-001 | 患者申请绑定 | POST /matches/request {therapist_id} | 201，status=pending | P0 | test_access::_setup_bound_pair |
| MTC-002 | 康复师申请绑定患者 | POST /matches/request {patient_id} | 201，status=pending | P1 | 手工 |
| MTC-003 | 管理员直接绑定 | POST /matches/request（admin 提供双方 id） | 201，status=approved | P1 | test_extended::test_admin_direct_match_and_second_match_conflict |
| MTC-004 | 重复申请拦截 | 已存在 pending/approved 同对申请 | 409 | P0 | test_extended::test_match_request_duplicate_and_unbind_flow |
| MTC-005 | 患者已有生效绑定 | 已 approved 再申请其他康复师 | 409 | P0 | test_extended::test_admin_direct_match_and_second_match_conflict |
| MTC-006 | 申请时对方角色错误 | therapist_id 指向患者 | 404 | P1 | 手工 |
| MTC-007 | 管理员审核绑定 | POST /admin/matches/{id}/review {approve:true} | 200，status=approved | P0 | test_access::_setup_bound_pair |
| MTC-008 | 管理员驳回绑定 | approve:false + note | 200，status=rejected | P1 | 手工 |
| MTC-009 | 查看我的绑定关系 | GET /matches（患者/康复师） | 只返回与自己相关的记录 | P1 | 手工 |
| MTC-010 | 查看他人绑定详情 | GET /matches/{id}（非双方非 admin） | 403 | P1 | 手工 |
| MTC-011 | 发起解绑 | POST /matches/{id}/unbind | 200，status=pending_unbind | P0 | test_extended::test_match_request_duplicate_and_unbind_flow |
| MTC-012 | 非生效绑定不可解绑 | 对 pending/rejected 记录解绑 | 400 | P2 | 手工 |
| MTC-013 | 管理员批准解绑 | review {approve:true}（pending_unbind） | status=terminated，双方权限回收 | P0 | test_extended::test_match_request_duplicate_and_unbind_flow |
| MTC-014 | 管理员驳回解绑 | review {approve:false}（pending_unbind） | status 回到 approved，绑定保持生效 | P0 | test_unbind_reject（修复验证） |

## 7. 康复计划（PRD F6）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| PLN-001 | 康复师创建计划 | POST /plans（含 tasks） | 201，返回计划+任务列表 | P0 | test_extended::test_plan_full_flow |
| PLN-002 | 患者查看本人计划 | GET /plans（患者） | 200 只含本人计划 | P1 | test_extended::test_plan_full_flow |
| PLN-003 | 康复师按患者查计划 | GET /plans?patient_id（绑定患者） | 200 | P1 | 手工 |
| PLN-004 | 康复师查未绑定患者计划 | GET /plans?patient_id=other | 403 | P1 | 手工 |
| PLN-005 | 患者打卡 | POST /plans/tasks/{id}/checkin | 201 | P0 | test_extended::test_plan_full_flow |
| PLN-006 | 同日重复打卡幂等 | 同任务同天再次打卡 | 201，返回同一 checkin id（更新） | P1 | test_extended::test_plan_full_flow |
| PLN-007 | 进度统计 | GET /plans/{id}/progress | total_tasks=2，completed_tasks=1，completion_rate=50.0 | P1 | test_extended::test_plan_full_flow |
| PLN-008 | 康复师调整计划 | PATCH /plans/{id} | 200，标题/状态更新 | P1 | test_extended::test_plan_full_flow |
| PLN-009 | 康复师新增任务 | POST /plans/{id}/tasks | 201，order_index 自动递增 | P2 | test_extended::test_plan_full_flow |
| PLN-010 | 患者改计划被拒 | 患者 PATCH /plans/{id} | 403 | P1 | test_extended::test_plan_full_flow |
| PLN-011 | 任务时长边界 | duration_minutes=0 或 >1440 | 422（schema 校验 ge=1 le=1440） | P3 | 手工 |

## 8. 消息（PRD F7）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| MSG-001 | 绑定双方互发消息 | 康复师→患者，患者→康复师 | 201 | P0 | test_extended::test_message_flow_and_unread |
| MSG-002 | 未读数统计 | 对方发消息后 GET /messages/unread-count | unread_count=1 | P0 | test_extended::test_message_flow_and_unread |
| MSG-003 | 会话列表 | GET /messages/conversations | 返回对端+最近消息+未读数 | P1 | test_extended::test_message_flow_and_unread |
| MSG-004 | 读取消息标记已读 | GET /messages?peer=...（mark_read 默认 true） | 消息 is_read=true，未读数归零 | P0 | test_extended::test_message_flow_and_unread |
| MSG-005 | 单条标记已读 | PUT /messages/{id}/read | 200，is_read=true | P2 | 手工 |
| MSG-006 | 标记他人消息已读 | 非接收方 PUT read | 403 | P2 | 手工 |
| MSG-007 | 分页/游标 | GET /messages?peer&limit&before | 按时间倒序+limit 截断 | P2 | 手工 |
| MSG-008 | 内容长度边界 | content 空串 / 超 5000 字符 | 422 | P2 | 手工 |

## 9. 告警（PRD F8）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| ALR-001 | 上报触发告警 | 上报 spo2=85 | 自动生成 critical 告警（spo2:lt） | P0 | test_extended::test_alert_thresholds_and_handle |
| ALR-002 | 正常值不触发 | 上报 spo2=98 | 无新告警 | P1 | test_extended::test_alert_thresholds_and_handle |
| ALR-003 | 康复师聚合查看告警 | GET /alerts（康复师，无 patient_id） | 返回名下所有患者告警 | P0 | test_access::test_therapist_sees_bound_patient_alerts_and_health |
| ALR-004 | 患者查看本人告警 | GET /alerts（患者） | 只返回本人 | P1 | 手工 |
| ALR-005 | 告警状态过滤 | GET /alerts?status=open / handled | 过滤生效 | P1 | test_extended::test_alert_thresholds_and_handle |
| ALR-006 | 康复师处理告警 | PATCH /alerts/{id}/handle {note} | status=handled，留痕 handler_note/handled_by/at | P0 | test_extended::test_alert_thresholds_and_handle |
| ALR-007 | 患者不可处理告警 | 患者 PATCH handle | 403 | P1 | test_extended::test_alert_thresholds_and_handle |
| ALR-008 | 管理员自定义阈值 | PUT /admin/thresholds/heart_rate:gt {value:100} | 200；后续 110bpm 触发自定义规则、90 不触发 | P1 | test_extended::test_alert_admin_override_threshold |
| ALR-009 | 删除自定义阈值 | DELETE /admin/thresholds/{key} | 204，恢复默认规则 | P2 | test_extended::test_alert_admin_override_threshold |
| ALR-010 | 阈值 key 格式校验 | PUT /admin/thresholds/xxx {key 非法} | 422（pattern 校验） | P2 | 手工 |

## 10. 管理后台（PRD F9）

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| ADM-001 | 用户列表 | GET /admin/users?role&q&page&size | 200，可按角色/关键词过滤 | P1 | 手工 |
| ADM-002 | 停用用户 | PATCH /admin/users/{id}/status?is_active=false | 200；该用户登录被拒（403） | P0 | test_extended::test_admin_user_status_and_stats |
| ADM-003 | 停用自己 | admin 停用自己的账号 | 400「不能停用自己的账号」 | P1 | test_extended::test_admin_user_status_and_stats |
| ADM-004 | 康复师审核列表 | GET /admin/therapists?status | 200，可按状态过滤 | P1 | 手工 |
| ADM-005 | 绑定/解绑审核列表 | GET /admin/matches?status | 200 | P1 | 手工 |
| ADM-006 | 阈值规则列表 | GET /admin/thresholds | 200，返回内置默认+DB 覆盖规则 | P1 | 手工 |
| ADM-007 | 平台统计 | GET /admin/statistics | users/matches/alerts/records/messages/plans 计数 | P1 | test_extended::test_admin_user_status_and_stats |
| ADM-008 | 审计日志 | GET /admin/audit-logs?action | 200，含登录/审核/绑定变更记录 | P1 | test_extended::test_admin_user_status_and_stats |

## 11. 系统与兼容性

| 用例编号 | 场景 | 步骤 | 预期 | 优先级 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| SYS-001 | 健康检查 | GET /healthz | 200，status=ok，database=up | P0 | test_health::test_healthz_ok |
| SYS-002 | OpenAPI 文档 | GET /openapi.json | 200，含核心路由 | P1 | test_health::test_openapi_docs_available |
| SYS-003 | 根路径信息 | GET / | 200，返回 docs/health 链接 | P3 | test_health::test_root_redirects_to_docs_info |
| SYS-004 | 前端构建 | cd frontend && npm run build | 生产构建通过 | P0 | T5 实测（见报告 §4.3） |
| SYS-005 | 前端-后端联调 | 登录→上报→查看趋势→消息→计划（真实服务） | 全流程无 JS 报错 | P0 | T5 实测（见报告 §4.4） |
| SYS-006 | 路由守卫（未登录） | 未登录访问 /patient | 重定向 /login | P1 | 代码走查（proxy.ts） |
| SYS-007 | 路由守卫（角色不符） | 患者访问 /admin | 重定向 /403 | P1 | 代码走查（proxy.ts + RequireRole） |
| SYS-008 | 前端 API 路径对齐 | 前端 api.* 调用与后端路由 | 全部命中（无 404 路径） | P0 | T5 实测（报告 §4.5） |

---

## 测试环境

- 操作系统：Windows 10（git-bash）
- 后端：Python 3.12.7（backend/.venv），FastAPI 0.133.1，pytest 9.1.1，SQLite（aiosqlite）测试库
- 前端：Next.js 16.2.9，React 19.2.4，recharts 3.10.1
- 说明：自动化测试通过 conftest 将 DATABASE_URL 指向 SQLite 文件，应用全量依赖注入（含 lifespan 建表与种子管理员），与 PostgreSQL 行为差异点见测试报告「风险项」。

## 覆盖统计

- 自动化用例：33 条（auth 9 + access 2 + health 3 + extended 18 + unbind_reject 1）
- 需求模块：认证 17 条 / RBAC 17 条 / 患者档案 8 条 / 健康数据 12 条 / 康复师 7 条 / 匹配 14 条 / 计划 11 条 / 消息 8 条 / 告警 10 条 / 管理 8 条 / 系统 8 条（含手工与自动化映射）
