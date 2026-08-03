"use client";

import { cn } from "@/lib/utils";

export interface ProgressProps {
  value: number;
  className?: string;
  /** 进度条颜色，默认主色 */
  barClassName?: string;
}

export function Progress({ value, className, barClassName }: ProgressProps) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-neutral-100", className)}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary-500 transition-all",
          barClassName
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
