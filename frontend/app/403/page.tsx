"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { homeForRole, useAuth } from "@/lib/auth";
import { Lock } from "lucide-react";

export default function ForbiddenPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [home, setHome] = useState("/login");

  useEffect(() => {
    if (!loading && user) setHome(homeForRole(user.user.role));
  }, [user, loading]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <Lock className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-semibold text-neutral-800">403</h1>
      <p className="text-neutral-500">您没有权限访问该页面</p>
      <Button onClick={() => router.replace(home)}>返回我的工作台</Button>
    </div>
  );
}
