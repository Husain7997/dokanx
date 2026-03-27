"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo
} from "react";

import { storageKeys, safeJsonParse, toRole } from "@dokanx/utils";

import type { AuthContextValue, AuthProviderProps, AuthUser } from "./types";
import { useAuthStore } from "./store";

const AuthContext = createContext<AuthContextValue | null>(null);

type PersistedSession = {
  accessToken: string;
  user: AuthUser;
};

function sanitizeUser(user: Record<string, unknown>) {
  return {
    id: String(user.id || user._id || ""),
    name: String(user.name || ""),
    email: String(user.email || ""),
    role: String(user.role || "CUSTOMER"),
    roleName: toRole(String(user.role || "customer")),
    phone: user.phone ? String(user.phone) : null,
    shopId: user.shopId ? String(user.shopId) : null
  } satisfies AuthUser;
}

export function AuthProvider({
  children,
  baseUrl,
  tenant = null,
  storageKey = storageKeys.session
}: AuthProviderProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const currentTenant = useAuthStore((state) => state.tenant);
  const setSession = useAuthStore((state) => state.setSession);
  const setTenant = useAuthStore((state) => state.setTenant);
  const setStatus = useAuthStore((state) => state.setStatus);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    const nextTenant = tenant || null;
    const prevTenantId = currentTenant?.id || "";
    const prevTenantSlug = currentTenant?.slug || "";
    const nextTenantId = nextTenant?.id || "";
    const nextTenantSlug = nextTenant?.slug || "";

    if (prevTenantId !== nextTenantId || prevTenantSlug !== nextTenantSlug) {
      setTenant(nextTenant);
    }
  }, [currentTenant?.id, currentTenant?.slug, setTenant, tenant]);

  async function fetchCurrentUser(accessTokenValue: string) {
    const response = await fetch(`${baseUrl}/me`, {
      headers: {
        Authorization: `Bearer ${accessTokenValue}`,
        ...(tenant?.id ? { "x-tenant-id": tenant.id } : {}),
        ...(tenant?.slug ? { "x-tenant-slug": tenant.slug } : {})
      }
    });

    if (!response.ok) {
      throw new Error("Session validation failed");
    }

    const data = await response.json();
    return sanitizeUser((data && typeof data === "object" && "user" in data ? data.user : data) || {});
  }

  async function login(payload: { email: string; password: string }) {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tenant?.id ? { "x-tenant-id": tenant.id } : {}),
        ...(tenant?.slug ? { "x-tenant-slug": tenant.slug } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Login failed" }));
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
    const session = {
      accessToken: String(data.accessToken || data.token || ""),
      user: sanitizeUser(data.user || {})
    };
    localStorage.setItem(storageKey, JSON.stringify(session));
    setSession(session);
  }

  async function refreshSession() {
    if (!accessToken) {
      clearSession();
      localStorage.removeItem(storageKey);
      throw new Error("Session refresh failed");
    }

    const nextUser = await fetchCurrentUser(accessToken);
    const session = {
      accessToken,
      user: nextUser
    };
    localStorage.setItem(storageKey, JSON.stringify(session));
    setSession(session);
  }

  async function restoreSession() {
    setStatus("restoring");
    const persisted = safeJsonParse<PersistedSession | null>(
      localStorage.getItem(storageKey),
      null
    );

    if (!persisted?.accessToken) {
      localStorage.removeItem(storageKey);
      clearSession();
      return;
    }

    try {
      setSession(persisted);
      await refreshSession();
    } catch {
      localStorage.removeItem(storageKey);
      clearSession();
    }
  }

  async function logout() {
    localStorage.removeItem(storageKey);
    clearSession();
  }

  useEffect(() => {
    void restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, storageKey]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      user,
      tenant: currentTenant,
      status,
      login,
      logout,
      refreshSession,
      restoreSession,
      hasRole: (...roles) =>
        !!user?.roleName && roles.includes(user.roleName)
    }),
    [accessToken, currentTenant, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
