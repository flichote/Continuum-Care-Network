"use client";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  highlight,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex items-center gap-4 rounded-md border bg-white p-4 text-left shadow-sm transition-all",
        onClick ? "cursor-pointer hover:border-primary-200 hover:shadow-md" : "cursor-default",
        highlight && "border-danger-200 bg-danger-50/40"
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            highlight ? "bg-danger-100 text-danger-500" : "bg-primary-50 text-primary-600"
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-neutral-500">{label}</p>
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            highlight ? "text-danger-600" : "text-neutral-800"
          )}
        >
          {value}
        </p>
      </div>
    </button>
  );
}
