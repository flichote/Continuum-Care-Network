"use client";

import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ items, activeKey, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-neutral-200",
        className
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5 text-sm transition-colors",
              active
                ? "font-medium text-primary-700"
                : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            {item.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
