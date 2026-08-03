"use client";

import { cn } from "@/lib/utils";

function scorePassword(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Za-z]/.test(pwd) && /\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12) score += 1;
  return score; // 0-3
}

const levels = [
  { label: "弱", color: "bg-danger-500", text: "text-danger-600" },
  { label: "中", color: "bg-warning-500", text: "text-warning-700" },
  { label: "强", color: "bg-success-500", text: "text-success-600" },
];

export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  if (!password) return null;
  const level = levels[Math.min(score, 3) - 1];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full bg-neutral-200",
              i < score && level?.color
            )}
          />
        ))}
      </div>
      {level && (
        <p className={cn("text-xs", level.text)}>
          密码强度：{level.label}（至少 8 位，含字母与数字）
        </p>
      )}
    </div>
  );
}
