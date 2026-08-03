"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PatientProfile } from "@/types";

export default function PatientProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    gender: "",
    birth_date: "",
    contact_phone: "",
    medical_history: "",
    allergies: "",
    discharge_summary: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    api
      .get<PatientProfile>("/users/me/patient-profile")
      .then((p) => {
        setForm({
          full_name: user?.user.full_name ?? "",
          gender: p.gender ?? "",
          birth_date: p.birth_date ? String(p.birth_date).slice(0, 10) : "",
          contact_phone: p.contact_phone ?? user?.user.phone ?? "",
          medical_history: p.medical_history ?? "",
          allergies: p.allergies ?? "",
          discharge_summary: p.discharge_summary ?? "",
          emergency_contact_name: p.emergency_contact_name ?? "",
          emergency_contact_phone: p.emergency_contact_phone ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      if (form.full_name.trim() !== user?.user.full_name) {
        await api.patch("/users/me", { full_name: form.full_name.trim() });
      }
      await api.put("/users/me/patient-profile", {
        gender: form.gender || null,
        birth_date: form.birth_date || null,
        contact_phone: form.contact_phone.trim() || null,
        medical_history: form.medical_history.trim() || null,
        allergies: form.allergies.trim() || null,
        discharge_summary: form.discharge_summary.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      });
      toast("档案已保存", "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwdError("");
    if (newPwd.length < 8 || !/[A-Za-z]/.test(newPwd) || !/\d/.test(newPwd)) {
      setPwdError("新密码至少 8 位，且同时包含字母和数字");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("两次输入的新密码不一致");
      return;
    }
    setPwdLoading(true);
    try {
      await api.post("/users/me/change-password", {
        old_password: oldPwd,
        new_password: newPwd,
      });
      toast("密码修改成功", "success");
      setPwdOpen(false);
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      setPwdError(err instanceof ApiError ? err.detail : "修改失败");
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800">个人档案</h1>
        <p className="mt-1 text-sm text-neutral-500">管理您的个人信息与健康档案</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本资料</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="姓名">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="性别">
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">请选择</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </Select>
          </Field>
          <Field label="出生日期">
            <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
          </Field>
          <Field label="联系电话">
            <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>健康档案</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="既往病史">
            <Textarea rows={3} value={form.medical_history} onChange={(e) => setForm({ ...form, medical_history: e.target.value })} />
          </Field>
          <Field label="过敏史">
            <Textarea rows={2} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </Field>
          <Field label="出院小结">
            <Textarea rows={2} value={form.discharge_summary} onChange={(e) => setForm({ ...form, discharge_summary: e.target.value })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>紧急联系人</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 rounded-md bg-warning-100 px-3 py-2 text-xs text-warning-700">
            紧急联系人信息属于敏感字段，仅您本人可见，康复师无法查看。
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="联系人姓名">
              <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
            </Field>
            <Field label="联系电话">
              <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>账号</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-500">
            登录账号：{user?.user.phone || user?.user.email}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPwdOpen(true)}>
              修改密码
            </Button>
            <Button variant="danger" onClick={() => setLogoutOpen(true)}>
              退出登录
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} loading={saving}>
          保存档案
        </Button>
      </div>

      <Dialog
        open={pwdOpen}
        onClose={() => setPwdOpen(false)}
        title="修改密码"
        width="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setPwdOpen(false)} disabled={pwdLoading}>
              取消
            </Button>
            <Button onClick={changePassword} loading={pwdLoading}>
              确认修改
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {pwdError && (
            <div className="rounded-md bg-danger-100 px-3 py-2 text-sm text-danger-600">{pwdError}</div>
          )}
          <Field label="当前密码" required>
            <Input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
          </Field>
          <Field label="新密码" required hint="至少 8 位，同时包含字母和数字">
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </Field>
          <Field label="确认新密码" required>
            <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          logout();
        }}
        title="退出登录"
        description="确定要退出当前账号吗？"
        confirmText="退出"
        danger
      />
    </div>
  );
}
