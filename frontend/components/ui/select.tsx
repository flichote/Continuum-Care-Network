"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ className, invalid, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-sm border bg-white px-3 pr-8 text-sm text-neutral-800 transition-colors focus:outline-none focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-400",
          invalid
            ? "border-danger-500 focus:border-danger-500 focus:ring-danger-100"
            : "border-neutral-200 focus:border-primary-500 focus:ring-primary-100",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
    </div>
  );
}
