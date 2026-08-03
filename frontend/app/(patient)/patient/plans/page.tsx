"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, statusBadgeVariant, statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckinDialog, type CheckinPayload } from "@/components/feature/plan/checkin-dialog";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { PLAN_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { ClipboardList } from "lucide-react";
import type { Plan, PlanProgress } from "@/types";

export default function PatientPlansPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, PlanProgress>>({});
  const [checkinTask, setCheckinTask] = useState<{ id: string; title: string } | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<Plan[]>("/plans");
      setPlans(list);
      const pm: Record<string, PlanProgress> = {};
      await Promise.all(
        list.map(async (p) => {
          try {
            pm[p.id] = await api.get<PlanProgress>(`/plans/${p.id}/progress`);
          } catch {
            // ignore
          }
        })
      );
      setProgressMap(pm);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activePlans = useMemo(() => plans.filter((p) => p.status === "active"), [plans]);
  const historyPlans = useMemo(
    () => plans.filter((p) => p.status !== "active"),
    [plans]
  );
  const [historyOpen, setHistoryOpen] = useState(false);

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
        <Skeleton className="h-36" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">康复计划</h1>
          <p className="mt-1 text-sm text-neutral-500">按计划执行训练并每日打卡</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<ClipboardList className="h-10 w-10" />}
              title="暂无康复计划"
              description="康复师正在为您制定计划，制定完成后即可查看并打卡"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">康复计划</h1>
        <p className="mt-1 text-sm text-neutral-500">按计划执行训练并每日打卡</p>
      </div>

      {activePlans.map((plan) => {
        const progress = progressMap[plan.id];
        const rate = progress?.completion_rate ?? 0;
        return (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{plan.title}</CardTitle>
                <Badge variant="active" dot>进行中</Badge>
              </div>
              <span className="text-xs text-neutral-400">
                {plan.start_date ? formatDate(plan.start_date) : "-"} ~{" "}
                {plan.end_date ? formatDate(plan.end_date) : "-"}
              </span>
            </CardHeader>
            <CardContent className="space-y-5">
              {plan.goal && (
                <div className="rounded-md bg-primary-50/60 p-3">
                  <p className="text-xs text-neutral-500">康复目标</p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-800">{plan.goal}</p>
                </div>
              )}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-neutral-500">整体完成率</span>
                  <span className="font-semibold tabular-nums text-primary-700">
                    {rate}%
                  </span>
                </div>
                <Progress value={rate} />
                <p className="mt-1 text-xs text-neutral-400">
                  已完成 {progress?.completed_tasks ?? 0} / {progress?.total_tasks ?? 0} 项任务
                </p>
              </div>

              <div className="space-y-2">
                {plan.tasks.length === 0 ? (
                  <p className="rounded-md border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-400">
                    计划中还没有任务
                  </p>
                ) : (
                  plan.tasks.map((task, i) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-md border border-neutral-100 bg-neutral-50/50 px-4 py-3"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-medium text-neutral-500 ring-1 ring-neutral-200">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-800">{task.title}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {[task.frequency, task.duration_minutes ? `${task.duration_minutes} 分钟` : null]
                            .filter(Boolean)
                            .join(" · ") || "每日训练"}
                        </p>
                        {task.description && (
                          <p className="mt-0.5 text-xs text-neutral-400">{task.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-accent-500 text-white hover:bg-accent-400"
                        onClick={() => setCheckinTask({ id: task.id, title: task.title })}
                      >
                        打卡
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {historyPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>历史计划</CardTitle>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {historyOpen ? "收起" : `展开（${historyPlans.length}）`}
            </button>
          </CardHeader>
          {historyOpen && (
            <CardContent className="space-y-3">
              {historyPlans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-neutral-100 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-800">{p.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {PLAN_STATUS_LABELS[p.status] ?? p.status} ·{" "}
                      {progressMap[p.id]?.completion_rate ?? 0}% 完成
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(p.status)}>{statusLabel(p.status)}</Badge>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

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
