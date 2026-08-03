# Continuum-Care-Network 监控方案

> 运维文档 — 配套 `docs/ops/deploy.md`。目标是「先可观测，再谈上线」：
> 上线前必须至少具备健康检查、日志收集与基础告警。

## 1. 监控目标与分层

| 分层 | 对象 | 关注点 |
| --- | --- | --- |
| L1 基础设施 | 服务器 CPU/内存/磁盘/网络 | 容量、IO、可用性 |
| L2 容器与编排 | 三容器状态、重启次数、健康检查结果 | 编排稳定性 |
| L3 应用 | FastAPI / Next.js 进程、错误率、响应时间 | 应用健康 |
| L4 业务 | 用户登录、健康数据上报、告警触发、消息量 | 业务可用性与体验 |

监控工具选型（说明即可，落地时二选一即可满足中小规模）：

| 类别 | 推荐工具 | 说明 |
| --- | --- | --- |
| Uptime | UptimeRobot / Better Stack / 自建黑盒探针 | 每分钟探测 `/healthz` 与前端首页，断线即告警 |
| 指标 | Prometheus + Grafana（cAdvisor 采集容器指标；node_exporter 采集主机指标） | 时序指标 + 可视化面板 |
| 日志 | Loki + Promtail / ELK / 云厂商（CloudWatch Logs） | 集中收集 `docker logs`，支持检索与告警 |
| 告警 | Alertmanager（Prometheus 配套）或工具自带通知 | 统一收敛到钉钉/企业微信/邮件/短信 |

## 2. 健康检查端点

| 端点 | 服务 | 说明 | 预期 |
| --- | --- | --- | --- |
| `GET /healthz` | backend | 存活 + 数据库连通性探测 | `{"status":"ok","database":"up"}`；DB 不可用返回 `degraded` |
| `GET /` | backend | 服务信息（含 docs/health 链接） | 200 |
| `GET /docs` | backend | OpenAPI Swagger UI | 200 |
| `GET /` | web | Next.js 首页 | 200 |
| `pg_isready` | db | PostgreSQL 就绪探测（compose healthcheck 已内置） | exit 0 |

compose 已为三服务配置健康检查（见 `docker-compose.yml`），`docker compose ps` 可查看 HEALTHY 状态；外部黑盒探针建议直接请求 `http://<域名>/healthz`。

## 3. 应用日志规范

### 3.1 规范约定

1. **统一输出到 stdout/stderr**：容器内不写日志文件，由 Docker/日志采集器统一收集（`docker logs`、Promtail、journald）。
2. **结构化格式（推荐 JSON Lines）**：便于采集与检索。后端 `logging` 配置建议输出：
   ```json
   {"ts":"2026-08-03T12:00:00Z","level":"INFO","logger":"ccn.backend","msg":"...","request_id":"...","path":"/api/v1/...","status":200,"duration_ms":12}
   ```
3. **请求标识（request_id）**：FastAPI 中间件为每个请求生成/透传 `X-Request-Id`，日志与前端错误上报携带同一 ID，便于端到端追链。
4. **级别规范**：
   - ERROR：请求处理失败、依赖调用失败（DB 异常、第三方超时）——必须告警关注；
   - WARNING：可恢复异常（401/403 高频、限流触发、慢查询）；
   - INFO：关键业务动作（登录、注册、审核通过、告警触发），默认记录；
   - DEBUG：仅开发环境开启，生产关闭。
5. **敏感信息脱敏**：日志禁止记录密码、token、完整手机号；手机号打码（`138****0000`），token 只记录前缀 4 位。

### 3.2 后端接入点

- 现有日志：`app/main.py` 使用 `logging.getLogger("ccn.backend")` 输出种子管理员等关键事件。
- 建议后续：在 `app/api/v1/router.py` 或依赖注入中加入请求日志中间件（记录 method/path/status/duration/request_id）。

### 3.3 前端日志

- 浏览器端 `console` 输出（开发）；生产建议接入前端错误监控（Sentry）或自建 `window.onerror` 上报，携带 `request_id` 与 `NEXT_PUBLIC_API_URL` 指向信息。

## 4. 指标采集

### 4.1 容器与主机（Prometheus + cAdvisor + node_exporter）

| 指标 | 含义 | 建议阈值 |
| --- | --- | --- |
| `container_cpu_usage_seconds_total` | 容器 CPU 使用 | 持续 > 80% 10 分钟告警 |
| `container_memory_working_set_bytes` | 容器内存 | 持续 > 85% 限额 10 分钟告警 |
| `container_restart_count` | 容器重启次数 | 5 分钟内 > 3 次告警 |
| `node_filesystem_avail_bytes` | 磁盘剩余 | < 20% 告警 |
| `node_load1` / `node_memory_MemAvailable_bytes` | 主机负载/内存 | 负载 > 核数×2 告警 |

### 4.2 应用指标（FastAPI）

建议接入 `prometheus-fastapi-instrumentator`（或手写中间件），暴露 `GET /metrics`：

| 指标 | 含义 | 建议阈值 |
| --- | --- | --- |
| `http_requests_total{method,path,status}` | 请求量 | 5xx 占比 > 5%（5 分钟）告警 |
| `http_request_duration_seconds` | 响应耗时 | p95 > 1000ms（10 分钟）告警 |
| `db_connectivity` / 探活 | DB 连通 | 探活失败即告警（与 /healthz 联动） |
| 业务指标（可选） | 登录成功/失败数、健康数据上报量、告警触发数 | 登录失败突增（> 10 次/分）告警 |

### 4.3 数据库指标

- PostgreSQL 自带 `pg_stat_activity`（连接数）、`pg_stat_database`（事务/死锁）。
- 连接数建议监控：`SELECT count(*) FROM pg_stat_activity`，> 80% 上限告警。
- 慢查询：`log_min_duration_statement=500` 输出到日志，采集后按耗时 TOP 排查。

## 5. 告警规则建议

| 级别 | 规则 | 条件 | 通知渠道 |
| --- | --- | --- | --- |
| P0 致命 | 后端健康检查失败 | `/healthz` 非 200 连续 3 次（约 90s） | 电话/短信 + 值班群 |
| P0 致命 | 前端不可达 | 黑盒探测连续 3 次失败 | 电话/短信 + 值班群 |
| P0 致命 | 数据库不可用 | `pg_isready` 失败或 `/healthz` 返回 `degraded` | 电话/短信 + 值班群 |
| P1 严重 | 容器频繁重启 | 5 分钟内 restart > 3 次 | 值班群 |
| P1 严重 | 磁盘不足 | 剩余 < 20% | 值班群 |
| P1 严重 | 5xx 比例超标 | 5xx 占比 > 5% 持续 5 分钟 | 值班群 |
| P2 警告 | 响应变慢 | p95 > 1000ms 持续 10 分钟 | 值班群 |
| P2 警告 | CPU/内存高 | 持续 > 80% 10 分钟 | 值班群 |
| P2 警告 | 登录失败突增 | > 10 次/分钟（疑似撞库） | 值班群 + 安全负责人 |
| P3 信息 | 证书即将过期 | TLS 证书剩余 < 14 天 | 邮件 |

> 告警收敛：同一规则连续触发只发一次，恢复后再触发才重新通知（Alertmanager `repeat_interval` 建议 30m–1h），避免告警风暴。

## 6. 巡检清单

**每日**（值班人员，5 分钟）：
- [ ] `docker compose ps` 全部 HEALTHY，无异常重启
- [ ] `/healthz` 返回 ok
- [ ] 昨日 ERROR 级别日志无异常堆积（`docker logs --since 24h backend | grep ERROR`）
- [ ] 磁盘剩余 > 20%

**每周**：
- [ ] 检查数据库备份文件生成成功且非空
- [ ] 检查慢查询日志 TOP N，评估索引
- [ ] 检查镜像与基础镜像是否有安全更新（`docker scout` / 镜像扫描）

**每月**：
- [ ] 执行一次备份恢复演练（见 deploy.md 7 节）
- [ ] 复核告警规则阈值是否仍合理（结合容量趋势）
- [ ] 轮换 JWT_SECRET 等敏感配置（如有泄露怀疑则立即）

## 7. 值班与升级路径

- 告警分级处理：P0 立即响应（目标 15 分钟内），P1 30 分钟内，P2 当日处理。
- 排查起点固定为「日志 → 指标 → 拓扑」：先看 `docker logs` 与 `/healthz`，再查 Prometheus 面板，最后检查网络/证书。
- 线上问题结论必须附日志证据（时间戳 + request_id + 错误堆栈），同步给 PM 与相关成员，并在运维日志/看板留痕。
