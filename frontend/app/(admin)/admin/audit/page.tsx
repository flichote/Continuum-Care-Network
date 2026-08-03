"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import { auditActionLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types";

const ACTION_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "auth.login", label: "登录" },
  { value: "auth.register", label: "注册" },
  { value: "plan.create", label: "创建计划" },
  { value: "plan.update", label: "调整计划" },
  { value: "match.request", label: "绑定申请" },
  { value: "match.unbind_request", label: "解绑申请" },
  { value: "admin.therapist_review", label: "康复师审核" },
  { value: "admin.match_review", label: "对接审核" },
  { value: "admin.user_status", label: "账号状态" },
  { value: "admin.threshold_upsert", label: "阈值配置" },
  { value: "alert.handle", label: "告警处理" },
];

export default function AdminAuditPage() {
  const [action, setAction] = useState("");
  const [items, setItems] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (p: number, act: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), size: "20" });
        if (act) params.set("action", act);
        const list = await api.get<AuditLog[]>(`/admin/audit-logs?${params.toString()}`);
        setItems(list);
        setHasMore(list.length === 20);
        setPage(p);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(1, action);
  }, [action, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">审计日志</h1>
        <p className="mt-1 text-sm text-neutral-500">关键操作留痕，只读查看</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-52">
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <span className="text-xs text-neutral-400">每页 20 条</span>
      </div>

      {loading ? (
        <Skeleton className="h-80" />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState title="暂无审计日志" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table className="border-0">
              <THead>
                <TR>
                  <TH>时间</TH>
                  <TH>操作</TH>
                  <TH>对象</TH>
                  <TH>详情</TH>
                  <TH>IP</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((log) => (
                  <TR key={log.id}>
                    <TD>{formatDateTime(log.created_at)}</TD>
                    <TD>
                      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                        {auditActionLabel(log.action)}
                      </span>
                    </TD>
                    <TD className="text-neutral-500">
                      {log.resource_type}
                      {log.resource_id ? ` · ${log.resource_id.slice(0, 8)}…` : ""}
                    </TD>
                    <TD className="max-w-[240px] truncate">{log.detail || "-"}</TD>
                    <TD className="text-neutral-400">{log.ip || "-"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={hasMore ? page + 1 : page}
        onChange={(p) => load(p, action)}
      />
    </div>
  );
}
