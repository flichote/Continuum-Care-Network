"use client";

import { HeartPulse } from "lucide-react";

/**
 * 认证页卡片容器（design-system §2.2 / pages.md §2.1）
 * 440px 居中卡片 + 品牌区。
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 via-white to-white p-4">
      {/* 装饰曲线 */}
      <svg
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 text-primary-100/60"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M40 120 C 80 40, 140 40, 180 100"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M30 150 C 80 70, 150 70, 190 130"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-600 text-white shadow-sm">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-semibold text-primary-800">延续康护</div>
            <div className="text-xs text-neutral-500">出院不离线，康复不中断</div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-neutral-800">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <div className="mt-5 text-center text-sm text-neutral-500">{footer}</div>
        )}
      </div>
    </div>
  );
}
