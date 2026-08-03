"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { MetricInputGroup, validateReport, type ReportValues } from "@/components/feature/health/metric-input-group";
import { RecordList } from "@/components/feature/health/record-list";
import { TrendChart } from "@/components/feature/health/trend-chart";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, todayISO } from "@/lib/utils";
import type { Alert as AlertType, HealthRecord, HealthRecordPage, TrendOut } from "@/types";

const METRIC_TABS = [
  { key: "blood_pressure", label: "血压" },
  { key: "heart_rate", label: "心率" },
  { key: "temperature", label: "体温" },
  { key: "spo2", label: "血氧" },
];

export default function PatientHealthPage() {
  const { toast } = useToast();
  const [values, setValues] = useState<ReportValues>({});
  const [errors, setErrors] = useState<Partial<Record<keyof ReportValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const [todayRecords, setTodayRecords] = useState<HealthRecord[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const [metricTab, setMetricTab] = useState("blood_pressure");
  const [days, setDays] = useState(7);
  const [trend, setTrend] = useState<TrendOut | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);

  const [alertBanner, setAlertBanner] = useState<AlertType | null>(null);

  const loadHistory = useCallback(async (p: number) => {
    setRecordsLoading(true);
    try {
      const data = await api.get<HealthRecordPage>(`/health/records?page=${p}&size=20`);
      setRecords(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch {
      // ignore
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const loadToday = useCallback(async () => {
    try {
      const from = `${todayISO()}T00:00:00`;
      const data = await api.get<HealthRecordPage>(
        `/health/records?from=${encodeURIComponent(from)}&size=50`
      );
      setTodayRecords(data.items);
    } catch {
      // ignore
    }
  }, []);

  const loadTrend = useCallback(async (mt: string, d: number) => {
    setTrendLoading(true);
    try {
      const data = await api.get<TrendOut>(`/health/trends?record_type=${mt}&days=${d}`);
      setTrend(data);
    } catch {
      setTrend(null);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(1);
    loadToday();
  }, [loadHistory, loadToday]);

  useEffect(() => {
    loadTrend(metricTab, days);
  }, [metricTab, days, loadTrend]);

  const submit = async () => {
    const { errors: errs, hasValue } = validateReport(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!hasValue) {
      setErrors({ systolic: "请至少填写一项指标" });
      return;
    }

    setSubmitting(true);
    setAlertBanner(null);
    try {
      const payloads: Array<{ record_type: string; value?: number; systolic?: number; diastolic?: number }> = [];
      if (values.systolic || values.diastolic) {
        payloads.push({
          record_type: "blood_pressure",
          systolic: Number(values.systolic),
          diastolic: Number(values.diastolic),
        });
      }
      if (values.heart_rate) payloads.push({ record_type: "heart_rate", value: Number(values.heart_rate) });
      if (values.temperature) payloads.push({ record_type: "temperature", value: Number(values.temperature) });
      if (values.spo2) payloads.push({ record_type: "spo2", value: Number(values.spo2) });

      const results = await Promise.all(
        payloads.map((p) => api.post<HealthRecord>("/health/records", p))
      );
      toast(`上报成功（${results.length} 项）`, "success");

      // 刷新今日摘要、历史与趋势
      await Promise.all([loadToday(), loadHistory(1), loadTrend(metricTab, days)]);
      // 检测新告警
      const alerts = await api.get<AlertType[]>("/alerts?status=open&size=1").catch(() => []);
      if (alerts.length > 0) setAlertBanner(alerts[0]);
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "上报失败，请重试", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">健康数据</h1>
        <p className="mt-1 text-sm text-neutral-500">记录血压、心率、体温与血氧，异常时系统将自动告警</p>
      </div>

      {/* 告警提示（上报后触发） */}
      {alertBanner && (
        <Alert
          variant={alertBanner.severity === "critical" ? "danger" : "warning"}
          critical={alertBanner.severity === "critical"}
          title={alertBanner.message}
          closable
          onClose={() => setAlertBanner(null)}
        >
          系统已根据指标阈值生成告警，请留意身体状况；绑定康复师也会收到提醒。
        </Alert>
      )}

      {/* 上报表单 */}
      <Card>
        <CardHeader>
          <CardTitle>数据上报</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <MetricInputGroup values={values} errors={errors} onChange={setValues} />
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-400">提交后每次上报独立记录，可多次上报</p>
            <Button size="lg" onClick={submit} loading={submitting}>
              提交上报
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 今日已上报 */}
      {todayRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>今日已上报</CardTitle>
            <span className="text-xs text-neutral-400">{todayRecords.length} 条</span>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {todayRecords.slice(0, 4).map((r) => (
              <div key={r.id} className="rounded-md bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">
                  {r.record_type === "blood_pressure"
                    ? "血压"
                    : r.record_type === "heart_rate"
                      ? "心率"
                      : r.record_type === "temperature"
                        ? "体温"
                        : "血氧"}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-800">
                  {r.record_type === "blood_pressure"
                    ? `${r.systolic}/${r.diastolic}`
                    : r.value}
                  <span className="ml-1 text-xs font-normal text-neutral-400">{r.unit}</span>
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">{formatDateTime(r.recorded_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 历史记录 */}
        <Card>
          <CardHeader>
            <CardTitle>历史记录</CardTitle>
          </CardHeader>
          <CardContent>
            <RecordList
              records={records}
              loading={recordsLoading}
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => loadHistory(p)}
            />
          </CardContent>
        </Card>

        {/* 趋势图 */}
        <Card>
          <CardHeader>
            <CardTitle>趋势图表</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs items={METRIC_TABS} activeKey={metricTab} onChange={setMetricTab} className="mb-4" />
            {trendLoading ? (
              <div className="h-64 animate-pulse rounded-md bg-neutral-100" />
            ) : trend ? (
              <TrendChart trend={trend} days={days} onDaysChange={setDays} />
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-neutral-400">
                暂无趋势数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
