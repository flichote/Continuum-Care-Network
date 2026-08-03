"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import {
  ClipboardCheck,
  FileSearch,
  Gauge,
  HeartPulse,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_NAV: NavItem[] = [
  { key: "dashboard", label: "数据看板", href: "/admin", icon: Gauge },
  { key: "reviews-therapists", label: "康复师审核", href: "/admin/reviews/therapists", icon: ShieldCheck },
  { key: "reviews-matchings", label: "对接审核", href: "/admin/reviews/matchings", icon: ClipboardCheck },
  { key: "users", label: "用户管理", href: "/admin/users", icon: Users },
  { key: "thresholds", label: "阈值配置", href: "/admin/thresholds", icon: Settings2 },
  { key: "audit", label: "审计日志", href: "/admin/audit", icon: FileSearch },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const current = ADMIN_NAV.find((n) => isActive(pathname, n.href));
  const title = current?.label ?? "管理端";

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            className="rounded-sm p-1.5 text-neutral-600 hover:bg-neutral-100 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="打开导航"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
              <HeartPulse className="h-4.5 w-4.5" />
            </div>
            <span className="text-base font-semibold text-primary-800">连续照护</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
              管理端
            </span>
          </div>
          <div className="ml-2 hidden h-5 w-px bg-neutral-200 sm:block" />
          <h1 className="text-base font-semibold text-neutral-800 sm:text-lg">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLogoutOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
          <Avatar name={user?.user.full_name} size="sm" />
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-16 z-20 hidden w-60 flex-col border-r border-neutral-200 bg-white lg:flex">
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {ADMIN_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.href)}
                className={cn(
                  "relative flex h-10 w-full items-center gap-3 rounded-sm px-3 text-sm transition-colors",
                  active
                    ? "bg-primary-50 font-medium text-primary-700"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary-600" />
                )}
                <Icon className="h-4.5 w-4.5" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-neutral-100 p-3 text-xs text-neutral-400">
          管理端 · 连续照护网络
        </div>
      </aside>

      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 lg:px-8">
          {children}
        </main>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="管理导航">
        <nav className="space-y-1">
          {ADMIN_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setDrawerOpen(false);
                  router.push(item.href);
                }}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-sm px-3 text-sm",
                  active
                    ? "bg-primary-50 font-medium text-primary-700"
                    : "text-neutral-600 hover:bg-neutral-100"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </Drawer>

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
