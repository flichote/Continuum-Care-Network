"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold text-neutral-800">404</h1>
      <p className="text-neutral-500">页面不存在或已移除</p>
      <Button onClick={() => router.replace("/")}>返回首页</Button>
    </div>
  );
}
