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
import { Badge, statusBadgeVariant, statusLabel } from "@/components/ui/badge";
import { ChipsSelect } from "@/components/feature/upload/chips-select";
import { UploadDropzone, type UploadedFile } from "@/components/feature/upload/upload-dropzone";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { LICENSE_TYPES, SPECIALTY_OPTIONS } from "@/lib/constants";
import type { TherapistProfile } from "@/types";

export default function OnboardingTherapistPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<string>("pending");
  const [reviewNote, setReviewNote] = useState("");
  const [organization, setOrganization] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get<TherapistProfile>("/users/me/therapist-profile")
      .then((p) => {
        setOrganization(p.organization ?? "");
        setLicenseType(p.license_type ?? "");
        setLicenseNumber(p.license_number ?? "");
        setSpecialties((p.specialties ?? "").split(",").filter(Boolean));
        setBio(p.bio ?? "");
        setStatus(p.status);
        setReviewNote(p.review_note ?? "");
        if (p.license_docs) {
          setFiles([{ name: p.license_docs, size: 0 }]);
        }
        setSubmitted(p.status === "pending" || p.status === "approved");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!organization.trim()) errs.organization = "请输入执业机构";
    if (!licenseType) errs.licenseType = "请选择执业类别";
    if (!licenseNumber.trim()) errs.licenseNumber = "请输入资格证书编号";
    if (files.length === 0) errs.files = "请上传资质证明材料";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await api.put("/users/me/therapist-profile", {
        organization: organization.trim(),
        license_type: licenseType,
        license_number: licenseNumber.trim(),
        license_docs: files.map((f) => f.name).join(",") || null,
        specialties: specialties.join(",") || null,
        bio: bio.trim() || null,
      });
      setSubmitted(true);
      setStatus("pending");
      toast("资质已提交，等待管理员审核", "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "提交失败，请重试", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireRole role="therapist">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-800">康复师资质提交</h1>
          <p className="mt-1 text-sm text-neutral-500">
            提交执业资质，管理员审核通过后即可接收患者
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-72" />
        ) : submitted && status === "pending" ? (
          <Card>
            <CardContent className="space-y-5 py-8 text-center">
              <Badge variant="pending" dot className="text-sm">
                资质审核中
              </Badge>
              <p className="text-neutral-600">
                您的资质材料已提交，管理员审核通过后即可接收患者并制定康复计划。
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  修改材料
                </Button>
                <Button onClick={() => router.replace("/therapist")}>进入工作台</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {status === "rejected" && reviewNote && (
              <div className="rounded-md border-l-4 border-danger-500 bg-danger-100 p-4 text-sm text-danger-600">
                <p className="font-semibold">资质被驳回</p>
                <p className="mt-1">驳回原因：{reviewNote}</p>
                <p className="mt-1 text-xs">请修改后重新提交审核。</p>
              </div>
            )}
            {status === "approved" && !submitted && (
              <div className="rounded-md bg-success-100 p-4 text-sm text-success-600">
                当前资质已通过审核，修改执业信息后需重新审核。
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>执业信息</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <Field label="执业机构" required error={errors.organization}>
                  <Input placeholder="如：市第一康复医院" value={organization} onChange={(e) => setOrganization(e.target.value)} invalid={!!errors.organization} />
                </Field>
                <Field label="执业类别" required error={errors.licenseType}>
                  <Select value={licenseType} onChange={(e) => setLicenseType(e.target.value)} invalid={!!errors.licenseType}>
                    <option value="">请选择</option>
                    {LICENSE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="资格证书编号" required error={errors.licenseNumber} className="sm:col-span-2">
                  <Input placeholder="证书编号" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} invalid={!!errors.licenseNumber} />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>资质证明材料</CardTitle>
              </CardHeader>
              <CardContent>
                <Field required error={errors.files}>
                  <UploadDropzone value={files} onChange={setFiles} multiple />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>专业信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field label="擅长方向" hint="可多选">
                  <ChipsSelect options={SPECIALTY_OPTIONS} value={specialties} onChange={setSpecialties} />
                </Field>
                <Field label="简介" hint={`${bio.length}/200 字`}>
                  <Textarea
                    rows={3}
                    maxLength={200}
                    placeholder="介绍您的专业背景与康复理念…"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </Field>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.replace("/therapist")} disabled={saving}>
                稍后提交
              </Button>
              <Button size="lg" onClick={submit} loading={saving}>
                提交审核
              </Button>
            </div>
          </div>
        )}
      </div>
    </RequireRole>
  );
}
