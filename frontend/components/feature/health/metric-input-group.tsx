"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export interface ReportValues {
  systolic?: string;
  diastolic?: string;
  heart_rate?: string;
  temperature?: string;
  spo2?: string;
}

export interface MetricInputGroupProps {
  values: ReportValues;
  errors: Partial<Record<keyof ReportValues, string>>;
  onChange: (v: ReportValues) => void;
}

function NumberInput({
  label,
  unit,
  value,
  error,
  placeholder,
  onChange,
  invalid,
}: {
  label: string;
  unit: string;
  value: string;
  error?: string;
  placeholder?: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <Field label={label} required error={error}>
      <div className="relative">
        <Input
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          invalid={invalid || !!error}
          onChange={(e) => onChange(e.target.value)}
          className="pr-14"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
          {unit}
        </span>
      </div>
    </Field>
  );
}

/** 健康数据上报输入组（design-system §7.2 数字输入带单位） */
export function MetricInputGroup({
  values,
  errors,
  onChange,
}: MetricInputGroupProps) {
  const set = (k: keyof ReportValues) => (v: string) =>
    onChange({ ...values, [k]: v });

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <NumberInput
        label="收缩压（高压）"
        unit="mmHg"
        placeholder="如 120"
        value={values.systolic ?? ""}
        error={errors.systolic}
        onChange={set("systolic")}
      />
      <NumberInput
        label="舒张压（低压）"
        unit="mmHg"
        placeholder="如 80"
        value={values.diastolic ?? ""}
        error={errors.diastolic}
        onChange={set("diastolic")}
      />
      <NumberInput
        label="心率"
        unit="次/分"
        placeholder="如 72"
        value={values.heart_rate ?? ""}
        error={errors.heart_rate}
        onChange={set("heart_rate")}
      />
      <NumberInput
        label="体温"
        unit="°C"
        placeholder="如 36.5"
        value={values.temperature ?? ""}
        error={errors.temperature}
        onChange={set("temperature")}
      />
      <NumberInput
        label="血氧饱和度 SpO₂"
        unit="%"
        placeholder="如 98"
        value={values.spo2 ?? ""}
        error={errors.spo2}
        onChange={set("spo2")}
      />
    </div>
  );
}

/** 客户端即时校验（服务端同样校验，双保险） */
export function validateReport(values: ReportValues): {
  errors: Partial<Record<keyof ReportValues, string>>;
  hasValue: boolean;
} {
  const errors: Partial<Record<keyof ReportValues, string>> = {};
  const checks: {
    key: keyof ReportValues;
    min: number;
    max: number;
    label: string;
  }[] = [
    { key: "systolic", min: 40, max: 250, label: "收缩压" },
    { key: "diastolic", min: 20, max: 200, label: "舒张压" },
    { key: "heart_rate", min: 20, max: 250, label: "心率" },
    { key: "temperature", min: 30, max: 45, label: "体温" },
    { key: "spo2", min: 50, max: 100, label: "血氧" },
  ];
  let hasValue = false;
  for (const c of checks) {
    const raw = values[c.key];
    if (!raw || raw.trim() === "") continue;
    hasValue = true;
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      errors[c.key] = "请输入有效数值";
    } else if (num < c.min || num > c.max) {
      errors[c.key] = `请输入 ${c.min}–${c.max} 之间的数值`;
    }
  }
  return { errors, hasValue };
}
