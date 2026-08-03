"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, loading, homePath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? homePath : "/login");
  }, [loading, user, homePath, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-600 text-white">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <span className="text-lg font-semibold text-primary-800">连续照护</span>
      </div>
      <p className="text-sm text-neutral-500">正在进入工作台…</p>
    </div>
  );
}
