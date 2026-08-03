"use client";

import { cn, initials } from "@/lib/utils";

const avatarColors = [
  "bg-primary-500",
  "bg-accent-500",
  "bg-info-500",
  "bg-violet-500",
  "bg-success-500",
  "bg-warning-500",
];

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hash = (name ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = avatarColors[hash % avatarColors.length];
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-sm" : size === "lg" ? "h-14 w-14 text-xl" : "h-10 w-10 text-base";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        color,
        sizeClass,
        className
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
