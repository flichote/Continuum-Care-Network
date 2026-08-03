"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireRole } from "@/components/layout/require-role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PatientProfile } from "@/types";

interface FormState {
  full_name: string;
  gender: string;
  birth_date: string;
  contact_phone: string;
  medical_history: string;
  allergies: string;
  discharge_summary: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

const EMPTY: FormState = {
  full_name: "",
  gender: "",
  birth_date: "",
  contact_phone: "",
  medical_history: "",
  allergies: "",
  discharge_summary: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

export default function OnboardingPatientPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const set = (k: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "请输入姓名";
    if (!form.gender) errs.gender = "请选择性别";
    if (!form.birth_date) errs.birth_date = "请选择出生日期";
    if (!form.contact_phone.trim()) errs.contact_phone = "请输入联系电话";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (form.full_name.trim() !== user?.user.full_name) {
        await api.patch("/users/me", { full_name: form.full_name.trim() });
        setUser(user ? { ...user, user: { ...user.user, full_name: form.full_name.trim() } } : user);
      }
      await api.put("/users/me/patient-profile", {
        gender: form.gender,
        birth_date: form.birth_date || null,
        contact_phone: form.contact_phone.trim() || null,
        medical_history: form.medical_history.trim() || null,
        allergies: form.allergies.trim() || null,
        discharge_summary: form.discharge_summary.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      });
      toast("档案已保存", "success");
      router.replace("/patient");
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "保存失败，请重试", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireRole role="patient">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-800">完善患者档案</h1>
          <p className="mt-1 text-sm text-neutral-500">
            填写基础信息与健康档案，帮助康复师更好地了解您的情况
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <Field label="姓名" required error={errors.full_name}>
                  <Input value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} invalid={!!errors.full_name} />
                </Field>
                <Field label="性别" required error={errors.gender}>
                  <Select value={form.gender} onChange={(e) => set("gender")(e.target.value)} invalid={!!errors.gender}>
                    <option value="">请选择</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </Select>
                </Field>
                <Field label="出生日期" required error={errors.birth_date}>
                  <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date")(e.target.value)} invalid={!!errors.birth_date} />
                </Field>
                <Field label="联系电话" required error={errors.contact_phone}>
                  <Input value={form.contact_phone} onChange={(e) => set("contact_phone")(e.target.value)} invalid={!!errors.contact_phone} />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>健康档案</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field label="既往病史" hint="如：高血压、糖尿病等">
                  <Textarea rows={3} placeholder="填写既往病史…" value={form.medical_history} onChange={(e) => set("medical_history")(e.target.value)} />
                </Field>
                <Field label="过敏史" hint="如：青霉素过敏">
                  <Textarea rows={2} placeholder="填写过敏史…" value={form.allergies} onChange={(e) => set("allergies")(e.target.value)} />
                </Field>
                <Field label="出院小结" hint="可填写关键出院医嘱或备注（文件上传将在后续版本支持）">
                  <Textarea rows={2} placeholder="出院小结/医嘱摘要…" value={form.discharge_summary} onChange={(e) => set("discharge_summary")(e.target.value)} />
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
                    <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name")(e.target.value)} placeholder="如：李建国" />
                  </Field>
                  <Field label="联系电话">
                    <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone")(e.target.value)} placeholder="紧急联系电话" />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.replace("/patient")} disabled={saving}>
                暂不完善
              </Button>
              <Button size="lg" onClick={submit} loading={saving}>
                保存档案
              </Button>
            </div>
          </div>
        )}
      </div>
    </RequireRole>
  );
}
