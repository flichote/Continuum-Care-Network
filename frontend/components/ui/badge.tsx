"use client";

import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "completed"
  | "normal"
  | "warning"
  | "critical"
  | "unbound"
  | "info"
  | "default";

const variantClass: Record<BadgeVariant, string> = {
  pending: "bg-warning-100 text-warning-700",
  approved: "bg-success-100 text-success-600",
  rejected: "bg-danger-100 text-danger-600",
  active: "bg-primary-50 text-primary-700",
  completed: "bg-success-100 text-success-600",
  normal: "bg-neutral-100 text-neutral-600",
  warning: "bg-warning-100 text-warning-700",
  critical: "bg-danger-100 text-danger-600",
  unbound: "bg-neutral-100 text-neutral-500",
  info: "bg-info-100 text-info-600",
  default: "bg-neutral-100 text-neutral-600",
};

const dotClass: Record<BadgeVariant, string> = {
  pending: "bg-warning-500",
  approved: "bg-success-500",
  rejected: "bg-danger-500",
  active: "bg-primary-500",
  completed: "bg-success-500",
  normal: "bg-neutral-400",
  warning: "bg-warning-500",
  critical: "bg-danger-500",
  unbound: "bg-neutral-400",
  info: "bg-info-500",
  default: "bg-neutral-400",
};

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Badge({
  variant = "default",
  dot,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClass[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClass[variant])} />
      )}
      {children}
    </span>
  );
}

/** 将业务状态字符串映射为徽标变体 */
export function statusBadgeVariant(status?: string): BadgeVariant {
  switch (status) {
    case "pending":
    case "pending_unbind":
      return "pending";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "active":
      return "active";
    case "completed":
    case "handled":
      return "completed";
    case "open":
      return "warning";
    case "warning":
      return "warning";
    case "critical":
      return "critical";
    case "terminated":
      return "unbound";
    case "normal":
      return "normal";
    default:
      return "default";
  }
}

export function statusLabel(status?: string): string {
  const map: Record<string, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已驳回",
    active: "进行中",
    completed: "已完成",
    archived: "已归档",
    open: "未处理",
    handled: "已处理",
    warning: "关注",
    critical: "紧急",
    normal: "正常",
    terminated: "已解除",
    pending_unbind: "待解绑",
    unbound: "未绑定",
  };
  return map[status ?? ""] ?? status ?? "-";
}
