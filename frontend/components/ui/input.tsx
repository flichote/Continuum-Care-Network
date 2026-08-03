"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-sm border bg-white px-3 text-sm text-neutral-800 transition-colors placeholder:text-neutral-400 focus:outline-none focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-400",
        invalid
          ? "border-danger-500 focus:border-danger-500 focus:ring-danger-100"
          : "border-neutral-200 focus:border-primary-500 focus:ring-primary-100",
        className
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
