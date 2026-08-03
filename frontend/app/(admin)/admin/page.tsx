"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/feature/stats/stat-card";
import { api } from "@/lib/api";
import { auditActionLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import {
  AlertTriangle,
  ClipboardCheck,
  HeartPulse,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AdminMatch, AdminTherapist, AuditLog, Statistics } from "@/types";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [pendingTherapists, setPendingTherapists] = useState<AdminTherapist[]>([]);
  const [pendingMatches, setPendingMatches] = useState<AdminMatch[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, pts, pms, logs] = await Promise.all([
          api.get<Statistics>("/admin/statistics"),
          api.get<AdminTherapist[]>("/admin/therapists?status=pending&size=5"),
          api.get<AdminMatch[]>("/admin/matches?status=pending&size=5"),
          api.get<AuditLog[]>("/admin/audit-logs?size=8"),
        ]);
        setStats(s);
        setPendingTherapists(pts);
        setPendingMatches(pms);
        setRecentLogs(logs);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">数据看板</h1>
        <p className="mt-1 text-sm text-neutral-500">平台运行概况与待办审核</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="平台用户"
          value={stats.users.patient + stats.users.therapist + stats.users.admin}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="患者 / 康复师"
          value={`${stats.users.patient} / ${stats.users.therapist}`}
          icon={<HeartPulse className="h-5 w-5" />}
        />
        <StatCard
          label="健康数据上报"
          value={stats.health_records}
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatCard
          label="待处理告警"
          value={stats.alerts.open ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          highlight={(stats.alerts.open ?? 0) > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 待办审核 */}
        <Card>
          <CardHeader>
            <CardTitle>待办审核</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => router.push("/admin/reviews/therapists")}
              className="flex w-full items-center gap-4 rounded-md border border-neutral-200 p-4 text-left transition-colors hover:border-primary-200 hover:bg-primary-50/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-800">康复师资质审核</p>
                <p className="text-xs text-neutral-400">
                  {pendingTherapists.length > 0
                    ? `${pendingTherapists.length} 位康复师待审核`
                    : "暂无待审核"}
                </p>
              </div>
              <Badge variant={pendingTherapists.length > 0 ? "pending" : "completed"}>
                {pendingTherapists.length > 0 ? pendingTherapists.length : "无"}
              </Badge>
            </button>
            <button
              onClick={() => router.push("/admin/reviews/matchings")}
              className="flex w-full items-center gap-4 rounded-md border border-neutral-200 p-4 text-left transition-colors hover:border-primary-200 hover:bg-primary-50/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-100 text-accent-500">
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-800">对接审核</p>
                <p className="text-xs text-neutral-400">
                  {pendingMatches.length > 0
                    ? `${pendingMatches.length} 条绑定/解绑申请待审核`
                    : "暂无待审核"}
                </p>
              </div>
              <Badge variant={pendingMatches.length > 0 ? "pending" : "completed"}>
                {pendingMatches.length > 0 ? pendingMatches.length : "无"}
              </Badge>
            </button>
          </CardContent>
        </Card>

        {/* 平台动态 */}
        <Card>
          <CardHeader>
            <CardTitle>平台动态</CardTitle>
            <button
              onClick={() => router.push("/admin/audit")}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              审计日志
            </button>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">暂无动态</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recentLogs.map((log) => (
                  <li key={log.id} className="flex items-center gap-3 py-2.5">
                    <MessageSquare className="h-4 w-4 shrink-0 text-neutral-300" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-700">
                        {auditActionLabel(log.action)}
                      </p>
                      <p className="text-xs text-neutral-400">{formatDateTime(log.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
