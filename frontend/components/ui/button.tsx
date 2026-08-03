"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800",
  secondary: "bg-primary-50 text-primary-700 hover:bg-primary-100",
  outline:
    "border border-neutral-300 bg-transparent text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50",
  ghost: "bg-transparent text-primary-600 hover:bg-primary-50",
  danger: "bg-danger-500 text-white shadow-sm hover:bg-danger-600",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-sm px-3 text-sm",
  md: "h-10 gap-2 rounded-sm px-4 text-sm",
  lg: "h-12 gap-2 rounded-sm px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  fullWidth,
  className,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:translate-y-px",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
