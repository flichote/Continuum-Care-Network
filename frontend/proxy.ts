import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 路由级守卫（Next.js 16 proxy，替代 middleware）。
 *
 * 说明：JWT 存放在 localStorage（前端单页应用常见做法），proxy 无法读取，
 * 因此这里通过登录时种下的非敏感角色 cookie（ccn_role）做“体验级”跳转：
 *  - 未登录访问受保护路由 -> /login
 *  - 角色不匹配 -> /403
 *  - 已登录访问 /login 等 -> 对应角色首页
 * 真正的安全边界由后端 API 401/403 + 客户端 RequireRole 守卫兜底。
 */

const AUTH_PATHS = ["/login", "/register", "/forgot-password"];
const ROLE_HOMES: Record<string, string> = {
  patient: "/patient",
  therapist: "/therapist",
  admin: "/admin",
};

function isProtected(pathname: string): boolean {
  return (
    pathname === "/patient" ||
    pathname.startsWith("/patient/") ||
    pathname === "/therapist" ||
    pathname.startsWith("/therapist/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源与自由页直接放行
  if (
    pathname === "/" ||
    pathname === "/403" ||
    pathname === "/404" ||
    pathname === "/500" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const role = request.cookies.get("ccn_role")?.value;
  const loggedIn = !!role && role in ROLE_HOMES;

  if (isProtected(pathname)) {
    if (!loggedIn) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/patient") && role !== "patient") {
      return NextResponse.redirect(new URL("/403", request.url));
    }
    if (pathname.startsWith("/therapist") && role !== "therapist") {
      return NextResponse.redirect(new URL("/403", request.url));
    }
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/403", request.url));
    }
    if (pathname.startsWith("/onboarding") && role !== "patient" && role !== "therapist") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // 已登录访问登录/注册页 -> 回到角色首页
  if (AUTH_PATHS.includes(pathname) && loggedIn) {
    return NextResponse.redirect(new URL(ROLE_HOMES[role as string], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
