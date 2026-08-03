"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth, homeForRole } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import {
  Activity,
  Bell,
  ClipboardList,
  HeartPulse,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Stethoscope,
  User,
  UserCircle,
  Users,
} from "lucide-react";
import type { UnreadCount } from "@/types";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: boolean;
}

const PATIENT_NAV: NavItem[] = [
  { key: "home", label: "首页仪表盘", href: "/patient", icon: Home },
  { key: "health", label: "健康数据", href: "/patient/health", icon: Activity },
  { key: "plans", label: "康复计划", href: "/patient/plans", icon: ClipboardList },
  { key: "therapist", label: "我的康复师", href: "/patient/therapist", icon: Stethoscope },
  { key: "messages", label: "消息", href: "/patient/messages", icon: MessageSquare, badge: true },
  { key: "profile", label: "个人档案", href: "/patient/profile", icon: User },
];

const THERAPIST_NAV: NavItem[] = [
  { key: "patients", label: "患者工作台", href: "/therapist", icon: Users },
  { key: "dashboard", label: "数据监测看板", href: "/therapist/dashboard", icon: LayoutDashboard },
  { key: "messages", label: "消息", href: "/therapist/messages", icon: MessageSquare, badge: true },
  { key: "profile", label: "个人档案", href: "/therapist/profile", icon: User },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/patient" || href === "/therapist") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useUnreadCount(): number {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .get<UnreadCount>("/messages/unread-count")
        .then((d) => active && setUnread(d.unread_count))
        .catch(() => {});
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  return unread;
}

export function AppShell({
  role,
  children,
}: {
  role: "patient" | "therapist";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const unread = useUnreadCount();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const nav = role === "patient" ? PATIENT_NAV : THERAPIST_NAV;
  const current = nav.find((n) => isActive(pathname, n.href));
  const title = current?.label ?? (role === "patient" ? "患者端" : "康复师端");
  const profileHref = role === "patient" ? "/patient/profile" : "/therapist/profile";

  const mobileTabs = useCallback(() => {
    if (role === "patient") {
      return [
        { key: "home", label: "首页", href: "/patient", icon: Home },
        { key: "health", label: "数据", href: "/patient/health", icon: Activity },
        { key: "messages", label: "消息", href: "/patient/messages", icon: MessageSquare },
        { key: "profile", label: "我的", href: "/patient/profile", icon: User },
      ];
    }
    return [
      { key: "patients", label: "患者", href: "/therapist", icon: Users },
      { key: "dashboard", label: "监测", href: "/therapist/dashboard", icon: Activity },
      { key: "messages", label: "消息", href: "/therapist/messages", icon: MessageSquare },
      { key: "profile", label: "我的", href: "/therapist/profile", icon: User },
    ];
  }, [role]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Topbar */}
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
            <span className="hidden text-base font-semibold text-primary-800 sm:block">
              连续照护
            </span>
          </div>
          <div className="ml-2 hidden h-5 w-px bg-neutral-200 sm:block" />
          <h1 className="text-base font-semibold text-neutral-800 sm:text-lg">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(role === "patient" ? "/patient/messages" : "/therapist/messages")}
            className="relative rounded-sm p-2 text-neutral-600 hover:bg-neutral-100"
            aria-label="通知"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-medium text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full p-1 hover:bg-neutral-100"
              aria-label="用户菜单"
            >
              <Avatar name={user?.user.full_name} size="sm" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-neutral-100 px-3 py-2">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {user?.user.full_name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {user?.user.role === "patient"
                        ? "患者"
                        : user?.user.role === "therapist"
                          ? "康复师"
                          : "管理员"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(profileHref);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    <UserCircle className="h-4 w-4 text-neutral-400" />
                    个人档案
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setLogoutOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar（桌面端） */}
      <aside className="fixed bottom-0 left-0 top-16 z-20 hidden w-60 flex-col border-r border-neutral-200 bg-white lg:flex">
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
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
                {item.badge && unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-medium text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-neutral-100 p-3 text-xs text-neutral-400">
          {role === "patient" ? "患者端" : "康复师端"} · 连续照护网络
        </div>
      </aside>

      {/* 主内容 */}
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* 移动端底部 TabBar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t border-neutral-200 bg-white lg:hidden">
        {mobileTabs().map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.href)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
                active ? "text-primary-600" : "text-neutral-400"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {tab.key === "messages" && unread > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-0.5 text-[9px] font-medium text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* 移动端抽屉导航 */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="导航菜单">
        <nav className="space-y-1">
          {nav.map((item) => {
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
                {item.badge && unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-medium text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
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
