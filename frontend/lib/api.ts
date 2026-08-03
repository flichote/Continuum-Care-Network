/**
 * API 客户端：统一封装 fetch，自动附加 JWT，401 时用 refresh token 刷新并重试。
 * 后端基址：NEXT_PUBLIC_API_URL（默认 http://localhost:8000/api/v1）
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const ACCESS_KEY = "ccn_access_token";
const REFRESH_KEY = "ccn_refresh_token";
const ROLE_COOKIE = "ccn_role";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

/** 供 proxy.ts 做体验级角色跳转的非敏感 cookie（真正鉴权在 API 层） */
export function setRoleCookie(role: string): void {
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=604800; samesite=lax`;
}

export function clearRoleCookie(): void {
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

let refreshPromise: Promise<string> | null = null;

async function requestRefresh(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new ApiError(401, "未登录");
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) throw new ApiError(res.status, "登录已过期");
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
  };
  setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

function buildHeaders(extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (extra) {
    for (const [k, v] of Object.entries(extra as Record<string, string>)) {
      headers[k] = v;
    }
  }
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = `请求失败 (${res.status})`;
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") {
      detail = body.detail;
    } else if (Array.isArray(body.detail)) {
      detail = body.detail
        .map((d: { msg?: string }) => d.msg ?? JSON.stringify(d))
        .join("；");
    }
  } catch {
    // 非 JSON 响应，保留默认文案
  }
  return new ApiError(res.status, detail);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  if (res.status === 401 && retry) {
    try {
      if (!refreshPromise) {
        refreshPromise = requestRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { ...buildHeaders(options.headers), Authorization: `Bearer ${newToken}` },
      });
    } catch {
      clearTokens();
      clearRoleCookie();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      throw new ApiError(401, "登录已过期，请重新登录");
    }
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
