"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { PlanTaskEditor, tasksToDrafts, type TaskDraft } from "@/components/feature/plan/plan-task-editor";
import { api, ApiError } from "@/lib/api";
import type { Plan, PlanTask } from "@/types";

function PlanFormPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const patientId = params.id;
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [weeks, setWeeks] = useState("4");
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const planId = searchParams.get("plan");
  const isEdit = !!planId;
  const [existingSignatures, setExistingSignatures] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      if (planId) {
        try {
          const plan = await api.get<Plan>(`/plans/${planId}`);
          setTitle(plan.title);
          setGoal(plan.goal ?? "");
          setStartDate(plan.start_date ? String(plan.start_date).slice(0, 10) : "");
          if (plan.end_date && plan.start_date) {
            const s = new Date(plan.start_date);
            const e = new Date(plan.end_date);
            const w = Math.max(1, Math.round((e.getTime() - s.getTime()) / (7 * 86400000)));
            setWeeks(String(w));
          }
          setTasks(tasksToDrafts(plan.tasks));
          setExistingSignatures(
            new Set(
              plan.tasks.map(
                (t) => `${t.title}|${t.frequency ?? ""}|${t.description ?? ""}`
              )
            )
          );
        } catch (err) {
          toast(err instanceof ApiError ? err.detail : "加载计划失败", "error");
        }
      }
      setLoading(false);
    })();
  }, [planId, toast]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "请输入计划名称";
    if (tasks.length === 0) errs.tasks = "请至少添加一个任务";
    const badTask = tasks.findIndex((t) => !t.title.trim());
    if (badTask >= 0) errs.tasks = `任务 ${badTask + 1} 缺少动作名称`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setConfirmOpen(false);
    setSaving(true);
    try {
      const endDate = startDate
        ? new Date(new Date(startDate).getTime() + Number(weeks || 1) * 7 * 86400000)
            .toISOString()
            .slice(0, 10)
        : undefined;

      const taskPayloads = tasks
        .filter((t) => t.title.trim())
        .map((t, idx) => ({
          title: t.title.trim(),
          description: t.description.trim() || undefined,
          frequency: t.frequency.trim() || undefined,
          duration_minutes: t.duration_minutes ? Number(t.duration_minutes) : undefined,
          order_index: idx,
        }));

      if (isEdit && planId) {
        await api.patch(`/plans/${planId}`, {
          title: title.trim(),
          goal: goal.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
        });
        // 后端未提供删除任务接口：仅追加「新增/变更」的任务，已存在任务保留
        for (const tp of taskPayloads) {
          const sig = `${tp.title}|${tp.frequency ?? ""}|${tp.description ?? ""}`;
          if (existingSignatures.has(sig)) continue;
          await api.post<PlanTask>(`/plans/${planId}/tasks`, tp).catch(() => {});
        }
        toast("计划已更新", "success");
      } else {
        await api.post("/plans", {
          patient_id: patientId,
          title: title.trim(),
          goal: goal.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate,
          tasks: taskPayloads,
        });
        toast("计划已发布", "success");
      }
      router.push(`/therapist/patients/${patientId}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">
          {isEdit ? "调整康复计划" : "制定康复计划"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          为患者 {patientId.slice(0, 8)}… 制定训练计划，发布后患者可见并开始打卡
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>计划信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="计划名称" required error={errors.title}>
            <Input
              placeholder="如：出院后 4 周居家康复计划"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              invalid={!!errors.title}
            />
          </Field>
          <Field label="康复目标">
            <Textarea
              rows={3}
              placeholder="描述计划目标，如：恢复下肢肌力，实现独立行走…"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="开始日期">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="持续周数" hint="自动计算结束日期">
              <Input
                inputMode="numeric"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value.replace(/[^\d]/g, ""))}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>训练任务</CardTitle>
          <span className="text-xs text-neutral-400">至少添加 1 个任务</span>
        </CardHeader>
        <CardContent>
          <Field error={errors.tasks}>
            <PlanTaskEditor tasks={tasks} onChange={setTasks} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push(`/therapist/patients/${patientId}`)} disabled={saving}>
          取消
        </Button>
        <Button size="lg" onClick={submit} loading={saving}>
          {isEdit ? "保存调整" : "发布计划"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title={isEdit ? "保存计划调整" : "发布计划"}
        description="发布后患者即可查看计划并开始打卡。确认提交？"
        confirmText="确认发布"
        loading={saving}
      />
    </div>
  );
}

export default function TherapistPlanPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-96 max-w-3xl" />}>
      <PlanFormPage />
    </Suspense>
  );
}
