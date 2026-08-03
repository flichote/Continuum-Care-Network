"use client";

import { cn } from "@/lib/utils";

interface FieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="flex items-center gap-1 text-sm text-neutral-700">
          {required && <span className="text-danger-500">*</span>}
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-neutral-500">{hint}</p>
      ) : null}
    </div>
  );
}
