"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { METRIC_DEFS, SEVERITY_LABELS } from "@/lib/constants";
import type { Threshold } from "@/types";

const METRIC_LABELS: Record<string, string> = {
  systolic: "收缩压",
  diastolic: "舒张压",
  heart_rate: "心率",
  temperature: "体温",
  spo2: "血氧",
  blood_glucose: "血糖",
  weight: "体重",
};

export default function AdminThresholdsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Threshold | null>(null);
  const [value, setValue] = useState("");
  const [severity, setSeverity] = useState<Threshold["severity"]>("warning");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<Threshold[]>("/admin/thresholds");
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, Threshold[]>();
    items.forEach((t) => {
      const list = map.get(t.metric) ?? [];
      list.push(t);
      map.set(t.metric, list);
    });
    return Array.from(map.entries());
  }, [items]);

  const openEdit = (t: Threshold) => {
    setEditing(t);
    setValue(String(t.value));
    setSeverity(t.severity);
    setMessage(t.message);
  };

  const save = async () => {
    if (!editing) return;
    const num = Number(value);
    if (!Number.isFinite(num)) {
      toast("请输入有效数值", "error");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/thresholds/${editing.key}`, {
        key: editing.key,
        metric: editing.metric,
        direction: editing.direction,
        value: num,
        severity,
        message: message.trim() || editing.message,
      });
      toast("阈值已更新", "success");
      setEditing(null);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async (t: Threshold) => {
    try {
      await api.del(`/admin/thresholds/${t.key}`);
      toast("已恢复默认阈值", "success");
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "操作失败", "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">告警阈值配置</h1>
        <p className="mt-1 text-sm text-neutral-500">
          配置各指标的异常判定阈值，新阈值对后续上报即时生效
        </p>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-neutral-400">
            暂无阈值规则
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([metric, rules]) => {
            const def = METRIC_DEFS[metric as keyof typeof METRIC_DEFS];
            return (
              <Card key={metric}>
                <CardHeader>
                  <CardTitle>
                    {METRIC_LABELS[metric] ?? metric}
                    <span className="ml-2 text-sm font-normal text-neutral-400">
                      {def?.unit ?? ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <THead>
                      <TR>
                        <TH>方向</TH>
                        <TH>阈值</TH>
                        <TH>级别</TH>
                        <TH>告警文案</TH>
                        <TH>操作</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {rules.map((r) => (
                        <TR key={r.key}>
                          <TD>{r.direction === "gt" ? "高于 (>)" : "低于 (<)"}</TD>
                          <TD className="font-semibold tabular-nums text-neutral-800">
                            {r.value} {def?.unit ?? ""}
                          </TD>
                          <TD>
                            <Badge variant={statusBadgeVariant(r.severity)} dot>
                              {SEVERITY_LABELS[r.severity]}
                            </Badge>
                          </TD>
                          <TD>{r.message}</TD>
                          <TD>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                                编辑
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => resetToDefault(r)}>
                                恢复默认
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`编辑阈值${editing ? ` · ${METRIC_LABELS[editing.metric] ?? editing.metric}` : ""}`}
        width="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              取消
            </Button>
            <Button onClick={save} loading={saving}>
              保存
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              {editing.direction === "gt" ? "高于该值触发告警" : "低于该值触发告警"}
            </div>
            <Field label="阈值" required>
              <Input
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </Field>
            <Field label="告警级别" required>
              <Select value={severity} onChange={(e) => setSeverity(e.target.value as Threshold["severity"])}>
                <option value="info">提示</option>
                <option value="warning">关注</option>
                <option value="critical">紧急</option>
              </Select>
            </Field>
            <Field label="告警文案" required>
              <Input value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
          </div>
        )}
      </Dialog>
    </div>
  );
}
