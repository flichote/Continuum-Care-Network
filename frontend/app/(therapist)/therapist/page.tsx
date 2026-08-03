"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Alert as AlertBanner } from "@/components/ui/alert";
import { StatCard } from "@/components/feature/stats/stat-card";
import { usePatients, patientStatus } from "@/components/feature/therapist/use-patients";
import { formatTime, timeAgo } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  BellRing,
  ClipboardList,
  Search,
  Users,
} from "lucide-react";

type Filter = "all" | "attention" | "alert";

export default function TherapistPatientsPage() {
  const router = useRouter();
  const { patients, loading, reload } = usePatients();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const stats = useMemo(() => {
    const total = patients.length;
    const openAlerts = patients.reduce((n, p) => n + p.openAlerts.length, 0);
    const activePlans = patients.reduce(
      (n, p) => n + p.plans.filter((pl) => pl.status === "active").length,
      0
    );
    const criticalCount = patients.filter(
      (p) => p.openAlerts.some((a) => a.severity === "critical")
    ).length;
    return { total, openAlerts, activePlans, criticalCount };
  }, [patients]);

  const filtered = useMemo(() => {
    let list = patients;
    if (q.trim()) {
      list = list.filter((p) => p.full_name.includes(q.trim()));
    }
    if (filter === "attention") {
      list = list.filter((p) => patientStatus(p) !== "normal");
    }
    if (filter === "alert") {
      list = list.filter((p) => p.openAlerts.length > 0);
    }
    return list;
  }, [patients, q, filter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">患者工作台</h1>
        <p className="mt-1 text-sm text-neutral-500">管理名下患者，及时响应异常指标</p>
      </div>

      {/* 统计条 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="在册患者"
          value={stats.total}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="待处理告警"
          value={stats.openAlerts}
          icon={<BellRing className="h-5 w-5" />}
          highlight={stats.openAlerts > 0}
          onClick={() => router.push("/therapist/dashboard")}
        />
        <StatCard
          label="计划执行中"
          value={stats.activePlans}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="紧急患者"
          value={stats.criticalCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          highlight={stats.criticalCount > 0}
          onClick={() => setFilter("alert")}
        />
      </div>

      {/* 紧急告警横幅 */}
      {stats.criticalCount > 0 && (
        <AlertBanner
          variant="danger"
          critical
          title={`${stats.criticalCount} 名患者存在紧急指标，请尽快处理`}
          closable={false}
        >
          <button
            onClick={() => router.push("/therapist/dashboard")}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
          >
            前往监测看板处理
          </button>
        </AlertBanner>
      )}

      {/* 搜索筛选 */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="搜索患者姓名"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 rounded-sm bg-neutral-100 p-0.5">
            {([
              ["all", "全部"],
              ["attention", "需关注"],
              ["alert", "告警中"],
            ] as [Filter, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${
                  filter === k
                    ? "bg-white font-medium text-primary-700 shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 患者列表 */}
      {patients.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="暂无在册患者"
              description="等待管理员为您分配患者，或患者申请匹配后即可查看"
              action={
                <Button size="sm" variant="secondary" onClick={reload}>
                  刷新
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState title="没有符合条件的患者" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((p) => {
            const status = patientStatus(p);
            return (
              <Card
                key={p.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={p.full_name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-neutral-800">{p.full_name}</p>
                      <Badge variant={statusBadgeVariant(status)} dot>
                        {status === "normal" ? "正常" : status === "warning" ? "需关注" : "紧急"}
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                      <Activity className="h-3.5 w-3.5" />
                      {p.lastRecord
                        ? `最近上报 ${formatTime(p.lastRecord.recorded_at)}`
                        : "尚未上报"}
                      {p.openAlerts.length > 0 && (
                        <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-danger-100 px-1.5 py-0.5 text-[10px] font-medium text-danger-600">
                          <BellRing className="h-3 w-3" />
                          {p.openAlerts.length} 条告警
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-1 text-right text-xs text-neutral-400">
                    <p>{timeAgo(p.created_at)}建档</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/therapist/patients/${p.id}`)}
                    >
                      查看详情
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
