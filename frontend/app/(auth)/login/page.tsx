"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/feature/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim() || !password) {
      setError("请输入账号与密码");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(account.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="欢迎回来"
      subtitle="登录以继续您的居家康复之旅"
      footer={
        <>
          还没有账号？{" "}
          <Link href="/register" className="font-medium text-primary-600 hover:text-primary-700">
            立即注册
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert variant="danger" title={error} />}
        <Field label="账号（手机号 / 邮箱）" required>
          <Input
            placeholder="请输入手机号或邮箱"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            autoComplete="username"
          />
        </Field>
        <Field label="密码" required>
          <Input
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-neutral-500 hover:text-primary-600"
          >
            忘记密码？
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={loading}>
          登录
        </Button>
      </form>
    </AuthShell>
  );
}
