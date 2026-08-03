"use client";

import { cn } from "@/lib/utils";
import { HeartPulse, Stethoscope } from "lucide-react";

export type RoleChoice = "patient" | "therapist";

const OPTIONS: {
  value: RoleChoice;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "patient",
    title: "患者",
    desc: "出院后在家康复，需要持续健康监测与专业指导",
    icon: HeartPulse,
  },
  {
    value: "therapist",
    title: "康复师",
    desc: "专业康复治疗师，为在册患者制定康复计划与远程指导",
    icon: Stethoscope,
  },
];

export function RoleCard({
  value,
  onChange,
}: {
  value: RoleChoice | null;
  onChange: (v: RoleChoice) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-md border p-5 text-left transition-all",
              active
                ? "border-primary-500 bg-primary-50 shadow-sm"
                : "border-neutral-200 bg-white hover:border-primary-200 hover:bg-primary-50/40"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md",
                active ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-500"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p
                className={cn(
                  "text-base font-semibold",
                  active ? "text-primary-700" : "text-neutral-800"
                )}
              >
                {opt.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">{opt.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
