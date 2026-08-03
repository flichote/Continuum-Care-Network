"use client";

import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-sm border bg-white px-3 py-2.5 text-sm text-neutral-800 transition-colors placeholder:text-neutral-400 focus:outline-none focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-400",
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
