"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/feature/health/metric-card";
import { CheckinDialog, type CheckinPayload } from "@/components/feature/plan/checkin-dialog";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  METRIC_DEFS,
  metricDisplay,
  metricStatus,
} from "@/lib/constants";
import { greeting, timeAgo, todayISO } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  MessageSquare,
  Stethoscope,
} from "lucide-react";
import type {
  Alert as AlertType,
  Conversation,
  HealthRecord,
  Match,
  Plan,
  TherapistPublic,
} from "@/types";

export default function PatientDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [latest, setLatest] = useState<Record<string, HealthRecord>>({});
  const [openAlerts, setOpenAlerts] = useState<AlertType[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [therapist, setTherapist] = useState<TherapistPublic | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [checkinTask, setCheckinTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const types = ["blood_pressure", "heart_rate", "temperature", "spo2"];
      const records = await Promise.all(
        types.map((t) =>
          api
            .get<{ items: HealthRecord[] }>(`/health/records?record_type=${t}&size=1`)
            .catch(() => ({ items: [] as HealthRecord[] }))
        )
      );
      const map: Record<string, HealthRecord> = {};
      records.forEach((r, i) => {
        if (r.items.length > 0) map[types[i]] = r.items[0];
      });
      setLatest(map);

      const [alerts, planList, matchList, convList] = await Promise.all([
        api
          .get<AlertType[]>("/alerts?status=open")
          .catch(() => [] as AlertType[]),
        api.get<Plan[]>("/plans").catch(() => [] as Plan[]),
        api.get<Match[]>("/matches").catch(() => [] as Match[]),
        api
          .get<Conversation[]>("/messages/conversations")
          .catch(() => [] as Conversation[]),
      ]);
      setOpenAlerts(alerts);
      setPlans(planList);
      setConversations(convList);

      const approved = matchList.find((m) => m.status === "approved");
      setMatch(approved ?? null);
      if (approved) {
        const t = await api
          .get<TherapistPublic>(`/therapists/${approved.therapist_id}`)
          .catch(() => null);
        setTherapist(t);
      } else {
        setTherapist(null);
      }
    } catch {
      // 单个接口失败不阻塞仪表盘
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activePlan = useMemo(
    () => plans.find((p) => p.status === "active") ?? plans[0],
    [plans]
  );

  const checkedToday = useMemo(() => {
    const set = new Set<string>();
    return set;
  }, []);

  const doCheckin = async (payload: CheckinPayload) => {
    if (!checkinTask) return;
    setCheckinLoading(true);
    try {
      await api.post(`/plans/tasks/${checkinTask.id}/checkin`, {
        completed: payload.completed,
        note: payload.note,
      });
      toast(payload.completed ? "打卡成功" : "已记录跳过", "success");
      setCheckinTask(null);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "打卡失败", "error");
    } finally {
      setCheckinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  }

  const name = user?.user.full_name ?? "";
  const latestArr = Object.entries(latest);

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="flex flex-col gap-4 rounded-lg bg-gradient-to-r from-primary-50 to-white p-6 ring-1 ring-primary-100 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-bold text-neutral-800">
            {greeting()}，{name}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date().toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => router.push("/patient/health")}
          className="shrink-0"
        >
          <HeartPulse className="h-5 w-5" />
          上报今日数据
        </Button>
      </div>

      {/* 告警提醒 */}
      {openAlerts.length > 0 && (
        <Alert
          variant={openAlerts.some((a) => a.severity === "critical") ? "danger" : "warning"}
          critical={openAlerts.some((a) => a.severity === "critical")}
          title={openAlerts[0].message}
          closable
          onClose={() => setOpenAlerts((prev) => prev.slice(1))}
        >
          <button
            onClick={() => router.push("/patient/health")}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
          >
            查看详情与历史告警 <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </Alert>
      )}

      {/* 今日健康概览 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {latestArr.length === 0 ? (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardContent className="py-8">
              <EmptyState
                title="还没有健康数据"
                description="点击「上报今日数据」开始记录"
                action={
                  <Button size="sm" onClick={() => router.push("/patient/health")}>
                    去上报
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          latestArr.map(([type, record]) => {
            const def = METRIC_DEFS[type as keyof typeof METRIC_DEFS];
            const status = metricStatus(record);
            return (
              <MetricCard
                key={type}
                label={def?.label ?? type}
                value={metricDisplay(record)}
                unit={record.unit}
                status={status}
                color={def?.color}
              />
            );
          })
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 待办事项 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>今日康复任务</CardTitle>
            <button
              onClick={() => router.push("/patient/plans")}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              查看计划
            </button>
          </CardHeader>
          <CardContent>
            {!activePlan || activePlan.tasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-10 w-10" />}
                title="暂无待办任务"
                description={
                  activePlan
                    ? "康复计划还没有任务，等待康复师补充"
                    : "康复师正在为您制定康复计划"
                }
              />
            ) : (
              <ul className="space-y-3">
                {activePlan.tasks.slice(0, 5).map((task) => {
                  const done = checkedToday.has(task.id);
                  return (
                    <li
                      key={task.id}
                      className="flex items-center gap-3 rounded-md border border-neutral-100 bg-neutral-50/50 px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {task.frequency || "每日"} · {task.duration_minutes ? `${task.duration_minutes} 分钟` : "—"}
                        </p>
                      </div>
                      {done ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success-600">
                          <CheckCircle2 className="h-4 w-4" />
                          已完成
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-accent-100 text-accent-500 hover:bg-accent-100"
                          onClick={() =>
                            setCheckinTask({ id: task.id, title: task.title })
                          }
                        >
                          打卡
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 我的康复师 + 最近消息 */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>我的康复师</CardTitle>
            </CardHeader>
            <CardContent>
              {therapist ? (
                <div className="flex items-center gap-3">
                  <Avatar name={therapist.full_name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-800">{therapist.full_name}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {therapist.organization || therapist.license_type || "康复师"}
                    </p>
                    {therapist.specialties && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {therapist.specialties.split(",").slice(0, 2).map((s) => (
                          <Badge key={s} variant="active">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : match ? (
                <p className="text-sm text-neutral-500">绑定申请审核中…</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-500">尚未绑定康复师</p>
                  <Button size="sm" variant="secondary" onClick={() => router.push("/patient/therapist")}>
                    去申请匹配
                  </Button>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                {therapist && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/patient/messages?peer=${therapist.user_id}`)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    联系康复师
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => router.push("/patient/therapist")}
                >
                  <Stethoscope className="h-4 w-4" />
                  查看详情
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近消息</CardTitle>
              <button
                onClick={() => router.push("/patient/messages")}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                全部
              </button>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-400">暂无消息</p>
              ) : (
                <button
                  onClick={() =>
                    router.push(`/patient/messages?peer=${conversations[0].peer_id}`)
                  }
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-neutral-50"
                >
                  <Avatar name={conversations[0].peer_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {conversations[0].peer_name}
                      </p>
                      {conversations[0].unread_count > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] text-white">
                          {conversations[0].unread_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {conversations[0].last_message || "开始沟通吧"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {timeAgo(conversations[0].last_message_at)}
                  </span>
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CheckinDialog
        open={!!checkinTask}
        onClose={() => setCheckinTask(null)}
        taskTitle={checkinTask?.title ?? ""}
        onSubmit={doCheckin}
        loading={checkinLoading}
      />
    </div>
  );
}
