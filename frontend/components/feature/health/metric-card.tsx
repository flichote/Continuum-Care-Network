"use client";

import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { MetricStatus } from "@/lib/constants";

const statusConfig: Record<
  MetricStatus,
  { dot: string; text: string; label: string }
> = {
  normal: { dot: "bg-success-500", text: "text-success-600", label: "正常" },
  warning: { dot: "bg-warning-500", text: "text-warning-700", label: "关注" },
  critical: { dot: "bg-danger-500", text: "text-danger-600", label: "紧急" },
};

export interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  status: MetricStatus;
  /** 与上次对比的趋势：up / down / flat */
  trend?: "up" | "down" | "flat";
  color?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  status,
  trend,
  color = "#0D9488",
}: MetricCardProps) {
  const cfg = statusConfig[status];
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{label}</p>
        <span className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
          <span className={cn("text-xs font-medium", cfg.text)}>{cfg.label}</span>
        </span>
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        <span
          className="text-3xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {value}
        </span>
        {unit && <span className="pb-0.5 text-sm text-neutral-500">{unit}</span>}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs text-neutral-400">
          {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5" />}
          {trend === "down" && <ArrowDownRight className="h-3.5 w-3.5" />}
          {trend === "flat" && <Minus className="h-3.5 w-3.5" />}
          <span>较上次</span>
        </div>
      )}
    </div>
  );
}
