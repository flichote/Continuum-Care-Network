"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Alert, HealthRecord, PatientLite, Plan } from "@/types";

export interface PatientWithMeta extends PatientLite {
  lastRecord?: HealthRecord | null;
  openAlerts: Alert[];
  plans: Plan[];
}

/**
 * 加载名下患者，并并行补充：最近一次上报、未处理告警、计划列表。
 * 后端数据级权限要求按 patient_id 逐患者查询，故采用 N+1（演示规模可接受）。
 */
export function usePatients() {
  const [patients, setPatients] = useState<PatientWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<PatientLite[]>("/patients?size=100");
      const withMeta = await Promise.all(
        list.map(async (p) => {
          const [openAlerts, healthPage, plans] = await Promise.all([
            api
              .get<Alert[]>(`/alerts?patient_id=${p.id}&status=open`)
              .catch(() => [] as Alert[]),
            api
              .get<{ items: HealthRecord[] }>(`/health/records?patient_id=${p.id}&size=1`)
              .catch(() => ({ items: [] as HealthRecord[] })),
            api
              .get<Plan[]>(`/plans?patient_id=${p.id}`)
              .catch(() => [] as Plan[]),
          ]);
          return {
            ...p,
            openAlerts,
            lastRecord: healthPage.items[0] ?? null,
            plans,
          };
        })
      );
      setPatients(withMeta);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { patients, loading, reload: load };
}

export function patientStatus(patient: PatientWithMeta): "normal" | "warning" | "critical" {
  if (patient.openAlerts.some((a) => a.severity === "critical")) return "critical";
  if (patient.openAlerts.length > 0) return "warning";
  return "normal";
}
