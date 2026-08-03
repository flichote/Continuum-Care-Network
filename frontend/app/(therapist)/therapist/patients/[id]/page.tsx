"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge, statusBadgeVariant, statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { RecordList } from "@/components/feature/health/record-list";
import { TrendChart } from "@/components/feature/health/trend-chart";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import {
  METRIC_DEFS,
  metricDisplay,
  metricStatus,
  PLAN_STATUS_LABELS,
} from "@/lib/constants";
import { formatDateTime, formatDate } from "@/lib/utils";
import { ArrowLeft, MessageSquare } from "lucide-react";
import type {
  Alert as AlertType,
  HealthRecord,
  HealthRecordPage,
  PatientLite,
  PatientProfile,
  Plan,
  PlanProgress,
  TrendOut,
} from "@/types";

type TabKey = "overview" | "health" | "plans" | "alerts" | "profile";

const TABS = [
  { key: "overview", label: "概览" },
  { key: "health", label: "健康数据" },
  { key: "plans", label: "康复计划" },
  { key: "alerts", label: "告警" },
  { key: "profile", label: "档案" },
];

export default function TherapistPatientDetailPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [patientName, setPatientName] = useState("患者");
  const [latest, setLatest] = useState<Record<string, HealthRecord>>({});
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, PlanProgress>>({});
  const [trendMetric, setTrendMetric] = useState("blood_pressure");
  const [trendDays, setTrendDays] = useState(7);
  const [trend, setTrend] = useState<TrendOut | null>(null);

  const [handleAlert, setHandleAlert] = useState<AlertType | null>(null);
  const [handleNote, setHandleNote] = useState("");
  const [handling, setHandling] = useState(false);

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [prof, recPage, alertList, planList] = await Promise.all([
        api.get<PatientProfile>(`/patients/${patientId}`).catch(() => null),
        api
          .get<HealthRecordPage>(`/health/records?patient_id=${patientId}&size=20`)
          .catch(() => ({ total: 0, page: 1, size: 20, items: [] as HealthRecord[] })),
        api.get<AlertType[]>(`/alerts?patient_id=${patientId}`).catch(() => [] as AlertType[]),
        api.get<Plan[]>(`/plans?patient_id=${patientId}`).catch(() => [] as Plan[]),
      ]);
      setProfile(prof);
      setRecords(recPage.items);
      setRecordsTotal(recPage.total);
      setRecordsPage(recPage.page);
      setAlerts(alertList);
      setPlans(planList);

      // 患者姓名（档案接口不含姓名，从列表补取）
      const plist = await api
        .get<PatientLite[]>("/patients?size=100")
        .catch(() => [] as PatientLite[]);
      const pInfo = plist.find((p) => p.id === patientId);
      if (pInfo) setPatientName(pInfo.full_name);

      // 每种指标最新一条
      const types = ["blood_pressure", "heart_rate", "temperature", "spo2"];
      const map: Record<string, HealthRecord> = {};
      for (const t of types) {
        const r = recPage.items.find((i) => i.record_type === t);
        if (r) map[t] = r;
      }
      setLatest(map);

      // 计划进度
      const pm: Record<string, PlanProgress> = {};
      await Promise.all(
        planList.map(async (p) => {
          try {
            pm[p.id] = await api.get<PlanProgress>(`/plans/${p.id}/progress`);
          } catch {
            // ignore
          }
        })
      );
      setProgressMap(pm);
    } catch {
      toast("加载患者数据失败", "error");
    } finally {
      setLoading(false);
    }
  }, [patientId, toast]);

  const loadTrend = useCallback(
    async (mt: string, days: number) => {
      try {
        const t = await api.get<TrendOut>(
          `/health/trends?record_type=${mt}&patient_id=${patientId}&days=${days}`
        );
        setTrend(t);
      } catch {
        setTrend(null);
      }
    },
    [patientId]
  );

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (tab === "health") loadTrend(trendMetric, trendDays);
  }, [tab, trendMetric, trendDays, loadTrend]);

  const activePlan = useMemo(() => plans.find((p) => p.status === "active"), [plans]);
  const openAlerts = useMemo(() => alerts.filter((a) => a.status === "open"), [alerts]);
  const recordsTotalPages = Math.max(1, Math.ceil(recordsTotal / 20));

  const submitHandle = async () => {
    if (!handleAlert) return;
    setHandling(true);
    try {
      await api.patch(`/alerts/${handleAlert.id}/handle`, {
        note: handleNote.trim() || undefined,
      });
      toast("已标记处理", "success");
      setHandleAlert(null);
      setHandleNote("");
      loadBase();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "处理失败", "error");
    } finally {
      setHandling(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const displayName = patientName || "患者";

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/therapist")}>
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <Avatar name={displayName} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-neutral-800">{displayName}</h1>
              {openAlerts.length > 0 ? (
                <Badge variant="critical" dot>
                  {openAlerts.length} 条未处理告警
                </Badge>
              ) : (
                <Badge variant="active" dot>状态正常</Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-neutral-500">
              建档于 {formatDate(profile.created_at)}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push(`/therapist/messages?peer=${patientId}`)}>
          <MessageSquare className="h-4 w-4" />
          发消息
        </Button>
      </div>

      <Tabs items={TABS} activeKey={tab} onChange={(k) => setTab(k as TabKey)} />

      {/* 概览 */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>最近健康数据</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(latest).length === 0 ? (
                <EmptyState title="暂无健康数据" description="患者尚未上报" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(latest).map(([type, r]) => {
                    const def = METRIC_DEFS[type as keyof typeof METRIC_DEFS];
                    const st = metricStatus(r);
                    return (
                      <div key={type} className="rounded-md bg-neutral-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-neutral-500">{def?.label}</p>
                          <Badge variant={statusBadgeVariant(st)}>
                            {st === "normal" ? "正常" : st === "warning" ? "关注" : "紧急"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-800">
                          {metricDisplay(r)}
                          <span className="ml-1 text-xs font-normal text-neutral-400">{r.unit}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {formatDateTime(r.recorded_at)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>当前计划摘要</CardTitle>
                <button
                  onClick={() => setTab("plans")}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  查看全部
                </button>
              </CardHeader>
              <CardContent>
                {activePlan ? (
                  <div className="space-y-2">
                    <p className="font-medium text-neutral-800">{activePlan.title}</p>
                    <Progress value={progressMap[activePlan.id]?.completion_rate ?? 0} />
                    <p className="text-xs text-neutral-400">
                      完成率 {progressMap[activePlan.id]?.completion_rate ?? 0}% ·{" "}
                      {activePlan.tasks.length} 项任务
                    </p>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-neutral-400">暂无进行中的计划</p>
                )}
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/therapist/patients/${patientId}/plan`)}
                  >
                    新建 / 调整计划
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>未处理告警</CardTitle>
                <button
                  onClick={() => setTab("alerts")}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  全部告警
                </button>
              </CardHeader>
              <CardContent>
                {openAlerts.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-400">暂无未处理告警</p>
                ) : (
                  <ul className="space-y-2">
                    {openAlerts.slice(0, 3).map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 rounded-md bg-danger-50/60 px-3 py-2 text-sm"
                      >
                        <Badge variant={statusBadgeVariant(a.severity)}>
                          {statusLabel(a.severity)}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-neutral-700">{a.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 健康数据 */}
      {tab === "health" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent>
              <RecordList
                records={records}
                page={recordsPage}
                totalPages={recordsTotalPages}
                onPageChange={async (p) => {
                  try {
                    const data = await api.get<HealthRecordPage>(
                      `/health/records?patient_id=${patientId}&page=${p}&size=20`
                    );
                    setRecords(data.items);
                    setRecordsTotal(data.total);
                    setRecordsPage(data.page);
                  } catch {
                    // ignore
                  }
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>趋势图表</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                items={[
                  { key: "blood_pressure", label: "血压" },
                  { key: "heart_rate", label: "心率" },
                  { key: "temperature", label: "体温" },
                  { key: "spo2", label: "血氧" },
                ]}
                activeKey={trendMetric}
                onChange={setTrendMetric}
                className="mb-4"
              />
              {trend ? (
                <TrendChart trend={trend} days={trendDays} onDaysChange={setTrendDays} />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-neutral-400">
                  暂无趋势数据
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 康复计划 */}
      {tab === "plans" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/therapist/patients/${patientId}/plan`)}>
              新建计划
            </Button>
          </div>
          {plans.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  title="尚未制定康复计划"
                  description="为该患者创建计划后，患者即可查看并打卡"
                  action={
                    <Button size="sm" onClick={() => router.push(`/therapist/patients/${patientId}/plan`)}>
                      新建计划
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            plans.map((p) => {
              const progress = progressMap[p.id];
              return (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>{p.title}</CardTitle>
                      <Badge variant={statusBadgeVariant(p.status)}>
                        {PLAN_STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-neutral-400">
                        {p.start_date ? formatDate(p.start_date) : "-"} ~{" "}
                        {p.end_date ? formatDate(p.end_date) : "-"}
                      </span>
                      {p.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/therapist/patients/${patientId}/plan?plan=${p.id}`)}
                        >
                          调整
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {p.goal && <p className="text-sm text-neutral-600">{p.goal}</p>}
                    <Progress value={progress?.completion_rate ?? 0} />
                    <p className="text-xs text-neutral-400">
                      完成率 {progress?.completion_rate ?? 0}% · 打卡{" "}
                      {progress?.completed_tasks ?? 0}/{progress?.total_tasks ?? 0}
                    </p>
                    <ul className="space-y-1.5">
                      {p.tasks.map((t, i) => (
                        <li key={t.id} className="flex gap-2 text-sm text-neutral-700">
                          <span className="text-neutral-300">{i + 1}.</span>
                          <span>
                            {t.title}
                            {t.frequency && <span className="ml-2 text-neutral-400">({t.frequency})</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 告警 */}
      {tab === "alerts" && (
        <Card>
          <CardHeader>
            <CardTitle>告警记录</CardTitle>
            <span className="text-xs text-neutral-400">{alerts.length} 条</span>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <EmptyState title="暂无告警记录" />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <Badge variant={statusBadgeVariant(a.severity)} dot>
                      {statusLabel(a.severity)}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-800">{a.message}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {formatDateTime(a.created_at)}
                        {a.handler_note ? ` · 处理备注：${a.handler_note}` : ""}
                      </p>
                    </div>
                    {a.status === "open" ? (
                      <Button size="sm" variant="secondary" onClick={() => setHandleAlert(a)}>
                        处理
                      </Button>
                    ) : (
                      <Badge variant="completed">已处理</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* 档案（康复师视角：紧急联系人已由后端脱敏） */}
      {tab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>患者档案</CardTitle>
            <span className="text-xs text-neutral-400">康复师视角 · 敏感字段已隐藏</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-neutral-500">性别</dt>
                <dd className="mt-0.5 text-neutral-800">
                  {profile.gender === "male" ? "男" : profile.gender === "female" ? "女" : "其他"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-500">出生日期</dt>
                <dd className="mt-0.5 text-neutral-800">{profile.birth_date ? formatDate(profile.birth_date) : "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-500">联系电话</dt>
                <dd className="mt-0.5 text-neutral-800">{profile.contact_phone || "-"}</dd>
              </div>
            </dl>
            <div>
              <dt className="text-sm text-neutral-500">既往病史</dt>
              <dd className="mt-1 rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
                {profile.medical_history || "无"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-500">过敏史</dt>
              <dd className="mt-1 rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
                {profile.allergies || "无"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-500">出院小结</dt>
              <dd className="mt-1 rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
                {profile.discharge_summary || "无"}
              </dd>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 告警处理弹窗 */}
      <Dialog
        open={!!handleAlert}
        onClose={() => setHandleAlert(null)}
        title="处理告警"
        width="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setHandleAlert(null)} disabled={handling}>
              取消
            </Button>
            <Button onClick={submitHandle} loading={handling}>
              标记已处理
            </Button>
          </>
        }
      >
        {handleAlert && (
          <div className="space-y-4">
            <Alert variant={handleAlert.severity === "critical" ? "danger" : "warning"}>
              {handleAlert.message}
            </Alert>
            <Field label="处理备注（可选）" hint="如：已联系患者 / 已安排复查">
              <Textarea
                rows={3}
                placeholder="填写处理方式或备注…"
                value={handleNote}
                onChange={(e) => setHandleNote(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Dialog>
    </div>
  );
}
