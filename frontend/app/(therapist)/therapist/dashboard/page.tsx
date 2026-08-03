"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, statusBadgeVariant, statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { usePatients } from "@/components/feature/therapist/use-patients";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatDate } from "@/lib/utils";
import { AlertTriangle, Users } from "lucide-react";
import type { Alert as AlertType } from "@/types";

function activityChartData(patients: ReturnType<typeof usePatients>["patients"]) {
  const byDay = new Map<string, number>();
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    byDay.set(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      0
    );
  }
  // 简化：以最近一次上报时间近似当日活跃（完整统计需逐条上报记录）
  patients.forEach((p) => {
    if (p.lastRecord) {
      const d = p.lastRecord.recorded_at.slice(0, 10);
      if (byDay.has(d)) byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
  });
  return Array.from(byDay.entries()).map(([date, count]) => ({ date: date.slice(5), count }));
}

export default function TherapistDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { patients, loading, reload } = usePatients();

  const [handleAlert, setHandleAlert] = useState<AlertType | null>(null);
  const [handleNote, setHandleNote] = useState("");
  const [handling, setHandling] = useState(false);

  const allAlerts = useMemo(
    () =>
      patients
        .flatMap((p) => p.openAlerts.map((a) => ({ ...a, patientName: p.full_name })))
        .sort((a, b) => {
          const rank = { critical: 0, warning: 1, info: 2 };
          return (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3);
        }),
    [patients]
  );

  const riskPatients = useMemo(
    () =>
      patients
        .filter((p) => p.openAlerts.length > 0)
        .sort((a, b) => b.openAlerts.length - a.openAlerts.length)
        .slice(0, 6),
    [patients]
  );

  const chartData = useMemo(() => activityChartData(patients), [patients]);

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
      reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "处理失败", "error");
    } finally {
      setHandling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">数据监测看板</h1>
        <p className="mt-1 text-sm text-neutral-500">多患者并行监测，及时响应异常指标</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 未处理告警 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>未处理告警</CardTitle>
            <span className="text-xs text-neutral-400">{allAlerts.length} 条</span>
          </CardHeader>
          <CardContent>
            {allAlerts.length === 0 ? (
              <EmptyState title="暂无未处理告警" description="所有患者指标正常" />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {allAlerts.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <Badge variant={statusBadgeVariant(a.severity)} dot>
                      {statusLabel(a.severity)}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-800">{a.message}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {a.patientName} · {formatDateTime(a.created_at)}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setHandleAlert(a)}>
                      处理
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/therapist/patients/${a.patient_id}`)}
                    >
                      查看
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* 风险患者 */}
          <Card>
            <CardHeader>
              <CardTitle>风险患者</CardTitle>
            </CardHeader>
            <CardContent>
              {riskPatients.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-400">暂无风险患者</p>
              ) : (
                <ul className="space-y-2">
                  {riskPatients.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => router.push(`/therapist/patients/${p.id}`)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-neutral-50"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-100 text-danger-500">
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-800">{p.full_name}</p>
                          <p className="text-xs text-neutral-400">
                            近 7 天异常 {p.openAlerts.length} 次
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 计划进度 */}
          <Card>
            <CardHeader>
              <CardTitle>计划进度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {patients.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-400">暂无患者</p>
              ) : (
                patients.slice(0, 6).map((p) => {
                  const active = p.plans.find((pl) => pl.status === "active");
                  if (!active) return null;
                  return (
                    <div key={p.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-neutral-700">{p.full_name}</span>
                        <span className="text-neutral-400">{active.title}</span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {active.tasks.length} 项任务 · 进行中
                      </p>
                    </div>
                  );
                })
              )}
              {patients.length > 0 && !patients.some((p) => p.plans.some((pl) => pl.status === "active")) && (
                <p className="py-4 text-center text-sm text-neutral-400">暂无进行中的计划</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 上报活跃度 */}
      <Card>
        <CardHeader>
          <CardTitle>近 7 天上报活跃度</CardTitle>
          <span className="flex items-center gap-1 text-xs text-neutral-400">
            <Users className="h-3.5 w-3.5" /> 上报人次（按最近一次上报近似）
          </span>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94A3B8" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 6,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 10px 15px -3px rgba(15,23,42,0.1)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" name="上报人次" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
            <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              {handleAlert.message}
              <span className="ml-2 text-xs text-neutral-400">{formatDate(handleAlert.created_at)}</span>
            </p>
            <Field label="处理备注（可选）">
              <Textarea
                rows={3}
                placeholder="如：已联系患者 / 已安排复查…"
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
