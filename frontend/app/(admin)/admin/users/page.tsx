"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Search } from "lucide-react";
import type { User } from "@/types";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<User | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ size: "100" });
      if (role !== "all") params.set("role", role);
      if (q.trim()) params.set("q", q.trim());
      const list = await api.get<User[]>(`/admin/users?${params.toString()}`);
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [role, q]);

  useEffect(() => {
    const t = window.setTimeout(load, 300);
    return () => window.clearTimeout(t);
  }, [load]);

  const toggleStatus = async () => {
    if (!target) return;
    setProcessing(true);
    try {
      await api.patch(`/admin/users/${target.id}/status?is_active=${!target.is_active}`);
      toast(target.is_active ? "账号已停用" : "账号已启用", "success");
      setTarget(null);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "操作失败", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">用户管理</h1>
        <p className="mt-1 text-sm text-neutral-500">查看用户列表，停用违规账号</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="搜索姓名 / 手机号 / 邮箱"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-44">
          <option value="all">全部角色</option>
          <option value="patient">患者</option>
          <option value="therapist">康复师</option>
          <option value="admin">管理员</option>
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-80" />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState title="未找到用户" />
          </CardContent>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>用户</TH>
              <TH>角色</TH>
              <TH>状态</TH>
              <TH>注册时间</TH>
              <TH>操作</TH>
            </TR>
          </THead>
          <TBody>
            {items.map((u) => (
              <TR key={u.id}>
                <TD>
                  <p className="font-medium text-neutral-800">{u.full_name}</p>
                  <p className="text-xs text-neutral-400">{u.phone || u.email || "-"}</p>
                </TD>
                <TD>
                  <Badge variant={u.role === "admin" ? "info" : u.role === "therapist" ? "active" : "default"}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </Badge>
                </TD>
                <TD>
                  <Badge variant={u.is_active ? "active" : "rejected"} dot>
                    {u.is_active ? "正常" : "已停用"}
                  </Badge>
                </TD>
                <TD>{formatDateTime(u.created_at)}</TD>
                <TD>
                  <Button
                    size="sm"
                    variant={u.is_active ? "outline" : "secondary"}
                    onClick={() => setTarget(u)}
                  >
                    {u.is_active ? "停用" : "启用"}
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={toggleStatus}
        title={target?.is_active ? "停用账号" : "启用账号"}
        description={
          target
            ? target.is_active
              ? `确定停用「${target.full_name}」吗？停用后该用户将无法登录与访问。`
              : `确定启用「${target.full_name}」吗？`
            : ""
        }
        confirmText={target?.is_active ? "确认停用" : "确认启用"}
        danger={target?.is_active}
        loading={processing}
      />
    </div>
  );
}
