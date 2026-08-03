"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, statusBadgeVariant, statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TherapistReviewDrawer } from "@/components/feature/admin/review-drawer";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { AdminTherapist } from "@/types";

type Filter = "all" | "pending" | "approved" | "rejected";

export default function AdminTherapistReviewsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AdminTherapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminTherapist | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    try {
      const list = await api.get<AdminTherapist[]>(
        f === "all" ? "/admin/therapists?size=100" : `/admin/therapists?status=${f}&size=100`
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

  const review = async (approve: boolean, note: string) => {
    if (!selected) return;
    setReviewing(true);
    try {
      await api.post(`/admin/therapists/${selected.user_id}/review`, {
        approve,
        note: note || undefined,
      });
      toast(approve ? "已通过审核" : "已驳回", "success");
      setSelected(null);
      load(filter);
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "操作失败", "error");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">康复师认证审核</h1>
        <p className="mt-1 text-sm text-neutral-500">审核康复师入驻资质，通过后即可接收患者</p>
      </div>

      <div className="flex gap-1 rounded-sm bg-neutral-100 p-0.5">
        {([
          ["pending", "待审核"],
          ["all", "全部"],
          ["approved", "已通过"],
          ["rejected", "已驳回"],
        ] as [Filter, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-sm px-4 py-1.5 text-sm transition-colors ${
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
            <EmptyState title="暂无审核记录" />
          </CardContent>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>姓名</TH>
              <TH>执业机构</TH>
              <TH>执业类别</TH>
              <TH>提交时间</TH>
              <TH>状态</TH>
              <TH>操作</TH>
            </TR>
          </THead>
          <TBody>
            {items.map((t) => (
              <TR key={t.user_id}>
                <TD className="font-medium text-neutral-800">{t.full_name}</TD>
                <TD>{t.organization || "-"}</TD>
                <TD>{t.license_type || "-"}</TD>
                <TD>{formatDateTime(t.created_at)}</TD>
                <TD>
                  <Badge variant={statusBadgeVariant(t.status)} dot>
                    {statusLabel(t.status)}
                  </Badge>
                </TD>
                <TD>
                  <Button size="sm" variant="outline" onClick={() => setSelected(t)}>
                    查看 / 审核
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <TherapistReviewDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        therapist={selected}
        onReview={review}
        loading={reviewing}
      />
    </div>
  );
}
