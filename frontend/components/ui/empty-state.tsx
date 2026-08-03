"use client";

import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-center",
        className
      )}
    >
      <div className="text-neutral-300">
        {icon ?? <Inbox className="h-10 w-10" />}
      </div>
      <p className="text-base text-neutral-400">{title}</p>
      {description && <p className="max-w-sm text-sm text-neutral-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
