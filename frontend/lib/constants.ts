import type {
  AlertSeverity,
  HealthRecord,
  HealthRecordType,
} from "@/types";

/** 健康指标元信息（design-system §2.5 图表色板） */
export const METRIC_DEFS: Record<
  HealthRecordType,
  { label: string; unit: string; color: string; fields: string[] }
> = {
  blood_pressure: {
    label: "血压",
    unit: "mmHg",
    color: "#0D9488",
    fields: ["systolic", "diastolic"],
  },
  heart_rate: { label: "心率", unit: "bpm", color: "#F97316", fields: ["value"] },
  temperature: { label: "体温", unit: "°C", color: "#3B82F6", fields: ["value"] },
  spo2: { label: "血氧", unit: "%", color: "#8B5CF6", fields: ["value"] },
  blood_glucose: { label: "血糖", unit: "mmol/L", color: "#64748B", fields: ["value"] },
  weight: { label: "体重", unit: "kg", color: "#22C55E", fields: ["value"] },
};

export const REPORT_METRICS: HealthRecordType[] = [
  "blood_pressure",
  "heart_rate",
  "temperature",
  "spo2",
];

/** 展示用参考区间（与后端阈值规则对齐，服务端为准） */
export const REFERENCE_RANGES: Record<string, { min?: number; max?: number }> = {
  systolic: { min: 90, max: 180 },
  diastolic: { min: 60, max: 120 },
  heart_rate: { min: 50, max: 120 },
  temperature: { min: 35.5, max: 39 },
  spo2: { min: 90, max: 100 },
};

export type MetricStatus = "normal" | "warning" | "critical";

export function metricStatus(record: HealthRecord): MetricStatus {
  if (record.record_type === "blood_pressure") {
    const s = checkValue(record.systolic, REFERENCE_RANGES.systolic);
    const d = checkValue(record.diastolic, REFERENCE_RANGES.diastolic);
    const worst = [s, d].sort((a, b) => rank(a) - rank(b))[0];
    return worst;
  }
  const r = REFERENCE_RANGES[record.record_type];
  if (!r) return "normal";
  return checkValue(record.value, r);
}

function rank(s: MetricStatus): number {
  return s === "critical" ? 0 : s === "warning" ? 1 : 2;
}

function checkValue(
  v: number | null | undefined,
  range: { min?: number; max?: number }
): MetricStatus {
  if (v == null) return "normal";
  if (range.max !== undefined && v > range.max) return "critical";
  if (range.min !== undefined && v < range.min) return "warning";
  return "normal";
}

export function metricDisplay(record: HealthRecord): string {
  if (record.record_type === "blood_pressure") {
    return `${record.systolic ?? "-"}/${record.diastolic ?? "-"}`;
  }
  return record.value != null ? String(record.value) : "-";
}

export const ROLE_LABELS: Record<string, string> = {
  patient: "患者",
  therapist: "康复师",
  admin: "管理员",
};

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: "提示",
  warning: "关注",
  critical: "紧急",
};

export const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  info: "info",
  warning: "warning",
  critical: "critical",
};

export const LICENSE_TYPES = [
  "康复治疗师",
  "康复医师",
  "物理治疗师",
  "作业治疗师",
  "言语治疗师",
  "中医康复师",
  "护理师",
];

export const SPECIALTY_OPTIONS = [
  "神经康复",
  "骨科康复",
  "心肺康复",
  "运动损伤",
  "老年康复",
  "儿童康复",
  "疼痛管理",
  "术后康复",
  "慢病管理",
  "中医调理",
];

export const PLAN_STATUS_LABELS: Record<string, string> = {
  active: "进行中",
  completed: "已完成",
  archived: "已归档",
};

export const MATCH_STATUS_LABELS: Record<string, string> = {
  pending: "待审核",
  approved: "已生效",
  rejected: "已驳回",
  pending_unbind: "待审核解绑",
  terminated: "已解除",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.register": "注册",
  "auth.login": "登录",
  "plan.create": "创建计划",
  "plan.update": "调整计划",
  "match.request": "绑定申请",
  "match.unbind_request": "解绑申请",
  "admin.therapist_review": "康复师审核",
  "admin.match_review": "对接审核",
  "admin.user_status": "账号状态",
  "admin.threshold_upsert": "阈值配置",
  "alert.handle": "告警处理",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
