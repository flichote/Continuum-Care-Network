"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, statusBadgeVariant, statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { UserPlus } from "lucide-react";
import type { AdminMatch, AdminTherapist } from "@/types";

type Filter = "pending" | "pending_unbind" | "approved" | "terminated" | "rejected";

const FILTERS: [Filter, string][] = [
  ["pending", "待审核绑定"],
  ["pending_unbind", "待审核解绑"],
  ["approved", "已生效"],
  ["terminated", "已解除"],
  ["rejected", "已驳回"],
];

export default function AdminMatchingsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AdminMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminMatch | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  // 分配弹窗
  const [assignOpen, setAssignOpen] = useState(false);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [therapists, setTherapists] = useState<{ id: string; name: string }[]>([]);
  const [assignPatient, setAssignPatient] = useState("");
  const [assignTherapist, setAssignTherapist] = useState("");

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    try {
      const list = await api.get<AdminMatch[]>(
        f === "pending" || f === "pending_unbind"
          ? `/admin/matches?status=${f}&size=100`
          : `/admin/matches?status=${f}&size=100`
      );
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const doReview = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      await api.post(`/admin/matches/${selected.id}/review`, {
        approve: action === "approve",
        note: note.trim() || undefined,
      });
      toast(action === "approve" ? "已通过" : "已驳回", "success");
      setSelected(null);
      setAction(null);
      setNote("");
      load(filter);
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "操作失败", "error");
    } finally {
      setProcessing(false);
    }
  };

  const openAssign = async () => {
    setAssignOpen(true);
    try {
      const [pts, ths] = await Promise.all([
        api.get<{ id: string; full_name: string }[]>("/admin/users?role=patient&size=100"),
        api.get<AdminTherapist[]>("/admin/therapists?status=approved&size=100"),
      ]);
      setPatients(pts.map((p) => ({ id: p.id, name: p.full_name })));
      setTherapists(ths.map((t) => ({ id: t.user_id, name: t.full_name })));
    } catch {
      setPatients([]);
      setTherapists([]);
    }
  };

  const doAssign = async () => {
    if (!assignPatient || !assignTherapist) {
      toast("请选择患者与康复师", "warning");
      return;
    }
    setProcessing(true);
    try {
      await api.post("/matches/request", {
        patient_id: assignPatient,
        therapist_id: assignTherapist,
        note: "管理员直接分配",
      });
      toast("分配成功，绑定已生效", "success");
      setAssignOpen(false);
      setAssignPatient("");
      setAssignTherapist("");
      load(filter);
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "分配失败", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">对接审核</h1>
          <p className="mt-1 text-sm text-neutral-500">审核患者-康复师绑定与解绑申请</p>
        </div>
        <Button variant="secondary" onClick={openAssign}>
          <UserPlus className="h-4 w-4" />
          分配患者
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-sm bg-neutral-100 p-0.5">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${
              filter === k
                ? "bg-white font-medium text-primary-700 shadow-sm"
                : "text-neutral-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-80" />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState title="该分类暂无申请" />
          </CardContent>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>患者</TH>
              <TH>康复师</TH>
              <TH>申请类型</TH>
              <TH>申请理由</TH>
              <TH>时间</TH>
              <TH>状态</TH>
              <TH>操作</TH>
            </TR>
          </THead>
          <TBody>
            {items.map((m) => (
              <TR key={m.id}>
                <TD className="font-medium text-neutral-800">{m.patient_name || "-"}</TD>
                <TD>{m.therapist_name || "-"}</TD>
                <TD>
                  {m.status === "pending_unbind"
                    ? "解绑"
                    : m.status === "pending"
                      ? "绑定"
                      : statusLabel(m.status)}
                </TD>
                <TD className="max-w-[200px] truncate">{m.request_note || "-"}</TD>
                <TD>{formatDateTime(m.created_at)}</TD>
                <TD>
                  <Badge variant={statusBadgeVariant(m.status)} dot>
                    {statusLabel(m.status)}
                  </Badge>
                </TD>
                <TD>
                  {(m.status === "pending" || m.status === "pending_unbind") && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelected(m);
                          setAction("approve");
                        }}
                      >
                        通过
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(m);
                          setAction("reject");
                          setNote("");
                        }}
                      >
                        驳回
                      </Button>
                    </div>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* 审核确认 */}
      <ConfirmDialog
        open={!!selected && action === "approve"}
        onClose={() => {
          setSelected(null);
          setAction(null);
        }}
        onConfirm={doReview}
        title="确认通过"
        description={
          selected
            ? `确认通过「${selected.patient_name || "患者"}」与「${selected.therapist_name || "康复师"}」的${selected.status === "pending_unbind" ? "解绑" : "绑定"}申请？`
            : ""
        }
        confirmText="确认"
        loading={processing}
      />
      <Dialog
        open={!!selected && action === "reject"}
        onClose={() => {
          setSelected(null);
          setAction(null);
        }}
        title="驳回申请"
        width="max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setSelected(null);
                setAction(null);
              }}
              disabled={processing}
            >
              取消
            </Button>
            <Button variant="danger" onClick={doReview} loading={processing} disabled={!note.trim()}>
              确认驳回
            </Button>
          </>
        }
      >
        <Field label="驳回原因" required>
          <Textarea
            rows={3}
            placeholder="请填写驳回原因…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </Dialog>

      {/* 分配患者 */}
      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="分配患者"
        width="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={processing}>
              取消
            </Button>
            <Button onClick={doAssign} loading={processing}>
              确认分配
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="选择患者" required>
            <Select value={assignPatient} onChange={(e) => setAssignPatient(e.target.value)}>
              <option value="">请选择患者</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="选择康复师" required hint="仅展示资质已通过的康复师">
            <Select value={assignTherapist} onChange={(e) => setAssignTherapist(e.target.value)}>
              <option value="">请选择康复师</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
