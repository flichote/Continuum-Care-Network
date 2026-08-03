"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { MessageSquare, RefreshCw, UserPlus } from "lucide-react";
import type { Match, TherapistPublic } from "@/types";

export default function PatientTherapistPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<Match | null>(null);
  const [therapist, setTherapist] = useState<TherapistPublic | null>(null);
  const [therapists, setTherapists] = useState<TherapistPublic[]>([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");
  const [applying, setApplying] = useState(false);
  const [unbindOpen, setUnbindOpen] = useState(false);
  const [unbinding, setUnbinding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const matchList = await api.get<Match[]>("/matches");
      const approved = matchList.find((m) => m.status === "approved");
      const pending = matchList.find(
        (m) => m.status === "pending" || m.status === "pending_unbind"
      );
      setMatch(approved ?? pending ?? null);
      if (approved) {
        const t = await api
          .get<TherapistPublic>(`/therapists/${approved.therapist_id}`)
          .catch(() => null);
        setTherapist(t);
      } else {
        setTherapist(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openApply = async () => {
    setApplyOpen(true);
    try {
      const list = await api.get<TherapistPublic[]>("/therapists");
      setTherapists(list);
    } catch {
      setTherapists([]);
    }
  };

  const submitApply = async () => {
    if (!selectedId) {
      toast("请选择康复师", "warning");
      return;
    }
    setApplying(true);
    try {
      await api.post("/matches/request", {
        therapist_id: selectedId,
        note: note.trim() || undefined,
      });
      toast("申请已提交，等待管理员审核", "success");
      setApplyOpen(false);
      setNote("");
      setSelectedId("");
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "提交失败", "error");
    } finally {
      setApplying(false);
    }
  };

  const submitUnbind = async () => {
    if (!match) return;
    setUnbinding(true);
    try {
      await api.post(`/matches/${match.id}/unbind`, { note: "患者申请更换康复师" });
      toast("解绑申请已提交，等待管理员审核", "success");
      setUnbindOpen(false);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "提交失败", "error");
    } finally {
      setUnbinding(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const status = match?.status ?? "unbound";
  const specialties = therapist?.specialties?.split(",").filter(Boolean) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">我的康复师</h1>
        <p className="mt-1 text-sm text-neutral-500">查看绑定状态与康复师专业信息</p>
      </div>

      {/* 绑定状态卡 */}
      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            {status === "approved" ? (
              <Badge variant="active" dot>已绑定</Badge>
            ) : status === "pending" ? (
              <Badge variant="pending" dot>待审核</Badge>
            ) : status === "pending_unbind" ? (
              <Badge variant="pending" dot>解绑审核中</Badge>
            ) : (
              <Badge variant="unbound" dot>未绑定</Badge>
            )}
            <p className="text-sm text-neutral-600">
              {status === "approved" && therapist
                ? `当前康复师：${therapist.full_name}`
                : status === "pending"
                  ? "您的匹配申请正在等待管理员审核"
                  : status === "pending_unbind"
                    ? "解绑申请已提交，等待管理员审核"
                    : "尚未绑定康复师，申请匹配后即可获得专业指导"}
            </p>
          </div>
          {status === "unbound" && (
            <Button onClick={openApply}>
              <UserPlus className="h-4 w-4" />
              申请匹配
            </Button>
          )}
          {status === "approved" && therapist && (
            <Button variant="outline" onClick={() => setUnbindOpen(true)}>
              <RefreshCw className="h-4 w-4" />
              申请更换
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 康复师档案 */}
      {therapist ? (
        <Card>
          <CardHeader>
            <CardTitle>康复师档案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={therapist.full_name} size="lg" />
              <div>
                <p className="text-lg font-semibold text-neutral-800">{therapist.full_name}</p>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {[therapist.organization, therapist.license_type].filter(Boolean).join(" · ") || "康复师"}
                </p>
              </div>
            </div>
            <dl className="grid gap-3 rounded-md bg-neutral-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">执业机构</dt>
                <dd className="mt-0.5 text-neutral-800">{therapist.organization || "-"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">执业类别</dt>
                <dd className="mt-0.5 text-neutral-800">{therapist.license_type || "-"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">资质状态</dt>
                <dd className="mt-0.5 text-neutral-800">
                  <Badge variant="approved" dot>已通过审核</Badge>
                </dd>
              </div>
            </dl>
            {specialties.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-neutral-500">擅长方向</p>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => (
                    <span key={s} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {therapist.bio && (
              <div>
                <p className="mb-1 text-sm text-neutral-500">简介</p>
                <p className="rounded-md bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-700">
                  {therapist.bio}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => router.push(`/patient/messages?peer=${therapist.user_id}`)}
              >
                <MessageSquare className="h-4 w-4" />
                发消息
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : status === "unbound" ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={<UserPlus className="h-10 w-10" />}
              title="等待匹配康复师"
              description="申请匹配后，管理员将为您分配合适的康复师"
              action={
                <Button size="sm" onClick={openApply}>
                  申请匹配
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {/* 申请匹配弹窗 */}
      <Dialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="申请匹配康复师"
        width="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setApplyOpen(false)} disabled={applying}>
              取消
            </Button>
            <Button onClick={submitApply} loading={applying} disabled={!selectedId}>
              提交申请
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="选择康复师" required>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {therapists.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-400">
                  暂无可申请的康复师（需资质审核通过）
                </p>
              ) : (
                therapists.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.user_id)}
                    className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                      selectedId === t.user_id
                        ? "border-primary-500 bg-primary-50"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <Avatar name={t.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-800">{t.full_name}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {t.organization || t.license_type || ""}
                        {t.specialties ? ` · ${t.specialties.split(",").slice(0, 2).join("、")}` : ""}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Field>
          <Field label="申请理由（可选）">
            <Textarea
              rows={2}
              placeholder="如：出院后需要血压监测指导…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={unbindOpen}
        onClose={() => setUnbindOpen(false)}
        onConfirm={submitUnbind}
        title="申请更换康复师"
        description="解绑后双方数据权限将即时回收，您需要重新匹配康复师。是否确认提交解绑申请？"
        confirmText="提交申请"
        loading={unbinding}
      />
    </div>
  );
}
