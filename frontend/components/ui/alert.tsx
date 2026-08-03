"use client";

import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

type AlertVariant = "info" | "warning" | "danger" | "success";

const variantConfig: Record<
  AlertVariant,
  { wrap: string; icon: typeof Info }
> = {
  info: { wrap: "bg-info-100 text-info-600", icon: Info },
  warning: { wrap: "bg-warning-100 text-warning-700", icon: AlertTriangle },
  danger: { wrap: "bg-danger-100 text-danger-600", icon: AlertCircle },
  success: { wrap: "bg-success-100 text-success-600", icon: CheckCircle2 },
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
  /** 紧急告警：左侧红色强调条 */
  critical?: boolean;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  closable,
  onClose,
  critical,
  className,
}: AlertProps) {
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-md p-4",
        cfg.wrap,
        critical && "border-l-4 border-danger-500",
        className
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && <div className="text-sm">{children}</div>}
      </div>
      {closable && (
        <button
          onClick={onClose}
          aria-label="关闭"
          className="shrink-0 rounded-sm p-1 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
