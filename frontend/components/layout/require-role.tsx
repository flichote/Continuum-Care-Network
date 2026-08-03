"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, homeForRole } from "@/lib/auth";
import { FullPageSkeleton } from "@/components/ui/skeleton";
import type { Role } from "@/types";

/**
 * 客户端角色守卫：未登录跳 /login，角色不匹配跳对应角色首页或 /403。
 * 与 proxy.ts 的体验级跳转互补，作为真正的兜底。
 */
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.user.role !== role) {
      const home = homeForRole(user.user.role);
      router.replace(home !== "/login" ? home : "/403");
    }
  }, [user, loading, role, router]);

  if (loading || !user || user.user.role !== role) {
    return <FullPageSkeleton />;
  }
  return <>{children}</>;
}
