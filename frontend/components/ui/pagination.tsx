"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className={cn("flex items-center justify-end gap-3 text-sm", className)}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="上一页"
        className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-neutral-600 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        上一页
      </button>
      <span className="text-neutral-500">
        第 <span className="font-medium text-primary-600">{page}</span> / {totalPages} 页
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="下一页"
        className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-neutral-600 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40"
      >
        下一页
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
