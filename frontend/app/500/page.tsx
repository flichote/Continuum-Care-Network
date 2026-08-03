"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

export default function ServerErrorPage() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-100 text-warning-500">
        <TriangleAlert className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-semibold text-neutral-800">500</h1>
      <p className="text-neutral-500">服务开小差了，请稍后重试</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.refresh()}>
          重试
        </Button>
        <Button variant="outline" onClick={() => router.replace("/")}>
          返回首页
        </Button>
      </div>
    </div>
  );
}
