"use client";

import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { METRIC_DEFS, metricDisplay, metricStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { HealthRecord } from "@/types";

export function RecordList({
  records,
  loading,
  page,
  totalPages,
  onPageChange,
}: {
  records: HealthRecord[];
  loading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  if (records.length === 0) {
    return (
      <EmptyState title="暂无健康数据" description="提交一次上报后，这里会显示历史记录" />
    );
  }
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 bg-white">
        {records.map((r) => {
          const def = METRIC_DEFS[r.record_type];
          const status = metricStatus(r);
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: def?.color ?? "#94A3B8" }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-800">
                  {def?.label ?? r.record_type}
                </p>
                <p className="text-xs text-neutral-400">
                  {formatDateTime(r.recorded_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold tabular-nums text-neutral-800">
                  {metricDisplay(r)}
                  <span className="ml-1 text-xs font-normal text-neutral-400">
                    {r.unit}
                  </span>
                </p>
              </div>
              <Badge variant={statusBadgeVariant(status)}>{status === "normal" ? "正常" : status === "warning" ? "关注" : "紧急"}</Badge>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
    </div>
  );
}
