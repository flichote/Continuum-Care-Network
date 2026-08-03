"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Badge, statusBadgeVariant, statusLabel } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Drawer } from "@/components/ui/drawer";
import { formatDateTime } from "@/lib/utils";
import type { AdminTherapist } from "@/types";

export function TherapistReviewDrawer({
  open,
  onClose,
  therapist,
  onReview,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  therapist: AdminTherapist | null;
  onReview: (approve: boolean, note: string) => void;
  loading?: boolean;
}) {
  const [note, setNote] = useState("");
  const [rejectMode, setRejectMode] = useState(false);

  if (!therapist) return null;

  const specialties = therapist.specialties?.split(",").filter(Boolean) ?? [];

  return (
    <Drawer open={open} onClose={onClose} title="资质审核" width="w-[420px]">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar name={therapist.full_name} size="lg" />
          <div>
            <p className="text-lg font-semibold text-neutral-800">{therapist.full_name}</p>
            <div className="mt-1">
              <Badge variant={statusBadgeVariant(therapist.status)} dot>
                {statusLabel(therapist.status)}
              </Badge>
            </div>
          </div>
        </div>

        <dl className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50/60 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">执业机构</dt>
            <dd className="text-right text-neutral-800">{therapist.organization || "-"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">执业类别</dt>
            <dd className="text-right text-neutral-800">{therapist.license_type || "-"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">资格证书编号</dt>
            <dd className="text-right font-mono text-neutral-800">
              {therapist.license_number || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">提交时间</dt>
            <dd className="text-right text-neutral-800">{formatDateTime(therapist.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">联系方式</dt>
            <dd className="text-right text-neutral-800">{therapist.phone || therapist.email || "-"}</dd>
          </div>
        </dl>

        {specialties.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-neutral-500">擅长方向</p>
            <div className="flex flex-wrap gap-2">
              {specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-700"
                >
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

        <div className="rounded-md border border-neutral-200 p-3 text-xs text-neutral-500">
          资质证明材料（示例）：{therapist.license_number ? "已上传 · 文件名见档案" : "未上传"}
        </div>

        {therapist.review_note && (
          <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-700">
            上次驳回原因：{therapist.review_note}
          </div>
        )}

        {therapist.status === "pending" && (
          <div className="space-y-4 border-t border-neutral-100 pt-4">
            {rejectMode ? (
              <Field label="驳回原因" required error={rejectMode && !note.trim() ? "请填写驳回原因" : undefined}>
                <Textarea
                  rows={3}
                  placeholder="说明驳回原因，将通知康复师…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            ) : (
              <Field label="审核备注（可选）">
                <Textarea
                  rows={2}
                  placeholder="通过时可填写备注…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            )}
            <div className="flex gap-3">
              {rejectMode ? (
                <>
                  <Button variant="outline" onClick={() => setRejectMode(false)} disabled={loading}>
                    返回
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    loading={loading}
                    disabled={!note.trim()}
                    onClick={() => onReview(false, note.trim())}
                  >
                    确认驳回
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="danger" className="flex-1" onClick={() => setRejectMode(true)} disabled={loading}>
                    驳回
                  </Button>
                  <Button className="flex-1" loading={loading} onClick={() => onReview(true, note.trim())}>
                    通过
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
