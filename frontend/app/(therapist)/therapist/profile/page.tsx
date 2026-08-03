"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, statusBadgeVariant, statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ChipsSelect } from "@/components/feature/upload/chips-select";
import { UploadDropzone, type UploadedFile } from "@/components/feature/upload/upload-dropzone";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LICENSE_TYPES, SPECIALTY_OPTIONS } from "@/lib/constants";
import type { TherapistProfile } from "@/types";

export default function TherapistProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const [status, setStatus] = useState<string>("pending");
  const [reviewNote, setReviewNote] = useState("");
  const [organization, setOrganization] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    api
      .get<TherapistProfile>("/users/me/therapist-profile")
      .then((p) => {
        setStatus(p.status);
        setReviewNote(p.review_note ?? "");
        setOrganization(p.organization ?? "");
        setLicenseType(p.license_type ?? "");
        setLicenseNumber(p.license_number ?? "");
        setSpecialties((p.specialties ?? "").split(",").filter(Boolean));
        setBio(p.bio ?? "");
        if (p.license_docs) setFiles([{ name: p.license_docs, size: 0 }]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
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
      toast("档案已保存，如修改执业信息需重新审核", "success");
      setStatus("pending");
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
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">个人档案</h1>
          <p className="mt-1 text-sm text-neutral-500">管理执业信息与专业资料</p>
        </div>
        <Badge variant={statusBadgeVariant(status)} dot>
          {statusLabel(status)}
        </Badge>
      </div>

      {status === "rejected" && reviewNote && (
        <div className="rounded-md border-l-4 border-danger-500 bg-danger-100 p-4 text-sm text-danger-600">
          <p className="font-semibold">资质被驳回</p>
          <p className="mt-1">驳回原因：{reviewNote}</p>
          <p className="mt-1 text-xs">请修改执业信息后重新提交审核。</p>
        </div>
      )}
      {status === "pending" && (
        <div className="rounded-md bg-warning-100 p-4 text-sm text-warning-700">
          资质审核中：管理员审核通过后即可接收患者。
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>执业信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="执业机构" required>
            <Input value={organization} onChange={(e) => setOrganization(e.target.value)} />
          </Field>
          <Field label="执业类别" required>
            <Select value={licenseType} onChange={(e) => setLicenseType(e.target.value)}>
              <option value="">请选择</option>
              {LICENSE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="资格证书编号" required className="sm:col-span-2">
            <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
          </Field>
          <Field label="资质证明材料" className="sm:col-span-2">
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
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </Field>
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
