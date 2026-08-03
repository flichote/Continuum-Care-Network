"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  api,
  clearRoleCookie,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setRoleCookie,
  setTokens,
} from "./api";
import type { MeOut, TokenPair } from "@/types";

export interface RegisterPayload {
  phone?: string;
  email?: string;
  password: string;
  full_name: string;
  role: "patient" | "therapist";
}

interface AuthState {
  user: MeOut | null;
  loading: boolean;
  login: (account: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (u: MeOut | null) => void;
  homePath: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function homeForRole(role?: string): string {
  if (role === "patient") return "/patient";
  if (role === "therapist") return "/therapist";
  if (role === "admin") return "/admin";
  return "/login";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeOut | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<MeOut>("/users/me");
      setUser(me);
      setRoleCookie(me.user.role);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const afterAuth = useCallback(async (pair: TokenPair) => {
    setTokens(pair.access_token, pair.refresh_token);
    const me = await api.get<MeOut>("/users/me");
    setUser(me);
    setRoleCookie(me.user.role);
  }, []);

  const login = useCallback(
    async (account: string, password: string) => {
      const pair = await api.post<TokenPair>("/auth/login", {
        account,
        password,
      });
      await afterAuth(pair);
    },
    [afterAuth]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const pair = await api.post<TokenPair>("/auth/register", payload);
      await afterAuth(pair);
    },
    [afterAuth]
  );

  const logout = useCallback(async () => {
    try {
      const rt = getRefreshToken();
      if (rt) await api.post("/auth/logout", { refresh_token: rt });
    } catch {
      // 忽略登出接口错误，本地状态照常清理
    }
    clearTokens();
    clearRoleCookie();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const homePath = homeForRole(user?.user.role);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshMe, setUser, homePath }),
    [user, loading, login, register, logout, refreshMe, homePath]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return ctx;
}
