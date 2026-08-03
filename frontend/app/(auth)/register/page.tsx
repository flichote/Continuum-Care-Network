"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/feature/auth/auth-shell";
import { PasswordStrength } from "@/components/feature/auth/password-strength";
import { RoleCard, type RoleChoice } from "@/components/feature/auth/role-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useAuth, type RegisterPayload } from "@/lib/auth";

const PHONE_RE = /^1\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<RoleChoice | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "请输入姓名";
    if (!account.trim()) {
      errs.account = "请输入手机号或邮箱";
    } else if (!PHONE_RE.test(account.trim()) && !EMAIL_RE.test(account.trim())) {
      errs.account = "请输入有效的手机号（11 位）或邮箱";
    }
    if (password.length < 8) {
      errs.password = "密码长度至少 8 位";
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errs.password = "密码必须同时包含字母和数字";
    }
    if (confirm !== password) errs.confirm = "两次输入的密码不一致";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep1()) setStep(2);
  };

  const submit = async () => {
    if (!role) {
      setError("请选择您的角色");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload: RegisterPayload = {
        password,
        full_name: fullName.trim(),
        role,
      };
      if (PHONE_RE.test(account.trim())) payload.phone = account.trim();
      else payload.email = account.trim().toLowerCase();
      await register(payload);
      router.replace(role === "patient" ? "/onboarding/patient" : "/onboarding/therapist");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "注册失败，请稍后重试");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="注册账号"
      subtitle="加入连续照护网络，开始您的康复之旅"
      footer={
        <>
          已有账号？{" "}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
            去登录
          </Link>
        </>
      }
    >
      {/* 步骤指示器 */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                step >= s ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-400"
              }`}
            >
              {s}
            </span>
            <span
              className={`text-sm ${step >= s ? "font-medium text-neutral-800" : "text-neutral-400"}`}
            >
              {s === 1 ? "账号信息" : "选择角色"}
            </span>
            {s === 1 && <span className="mx-1 h-px w-8 bg-neutral-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="danger" title={error} closable onClose={() => setError("")} />
        </div>
      )}

      {step === 1 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="space-y-5"
        >
          <Field label="姓名" required error={fieldErrors.fullName}>
            <Input
              placeholder="请输入真实姓名"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              invalid={!!fieldErrors.fullName}
            />
          </Field>
          <Field label="手机号 / 邮箱" required error={fieldErrors.account}>
            <Input
              placeholder="手机号或邮箱（二选一）"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              invalid={!!fieldErrors.account}
            />
          </Field>
          <Field label="设置密码" required error={fieldErrors.password}>
            <Input
              type="password"
              placeholder="至少 8 位，含字母与数字"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={!!fieldErrors.password}
            />
            <PasswordStrength password={password} />
          </Field>
          <Field label="确认密码" required error={fieldErrors.confirm}>
            <Input
              type="password"
              placeholder="再次输入密码"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              invalid={!!fieldErrors.confirm}
            />
          </Field>
          <Button type="submit" size="lg" fullWidth>
            下一步
          </Button>
        </form>
      ) : (
        <div className="space-y-5">
          <RoleCard value={role} onChange={(r) => setRole(r)} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="flex-1">
              上一步
            </Button>
            <Button size="lg" onClick={submit} loading={loading} className="flex-1">
              确认并继续
            </Button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
