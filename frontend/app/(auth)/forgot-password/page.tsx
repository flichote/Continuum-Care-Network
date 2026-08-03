"use client";

import Link from "next/link";
import { AuthShell } from "@/components/feature/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="找回密码"
      subtitle="该功能将在下一版本上线"
      footer={
        <>
          想起密码了？{" "}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
            返回登录
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <Alert variant="info" title="预留功能">
          手机号 / 邮箱验证码重置密码将在 v1.1 迭代中提供，敬请期待。
        </Alert>
        <Link href="/login" className="block">
          <Button variant="secondary" size="lg" fullWidth>
            返回登录
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}
