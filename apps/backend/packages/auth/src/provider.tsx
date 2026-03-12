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
  refreshToken: string;
  refreshTokenExpiresAt: string;
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
  const store = useAuthStore();

  useEffect(() => {
    store.setTenant(tenant);
  }, [store, tenant]);

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
      refreshToken: String(data.refreshToken || ""),
      refreshTokenExpiresAt: String(data.refreshTokenExpiresAt || ""),
      user: sanitizeUser(data.user || {})
    };
    localStorage.setItem(storageKey, JSON.stringify(session));
    store.setSession(session);
  }

  async function refreshSession() {
    if (!store.refreshToken) return;

    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tenant?.id ? { "x-tenant-id": tenant.id } : {}),
        ...(tenant?.slug ? { "x-tenant-slug": tenant.slug } : {})
      },
      body: JSON.stringify({ refreshToken: store.refreshToken })
    });

    if (!response.ok) {
      store.clearSession();
      localStorage.removeItem(storageKey);
      throw new Error("Session refresh failed");
    }

    const data = await response.json();
    const session = {
      accessToken: String(data.accessToken || data.token || ""),
      refreshToken: String(data.refreshToken || ""),
      refreshTokenExpiresAt: String(data.refreshTokenExpiresAt || ""),
      user: sanitizeUser(data.user || {})
    };
    localStorage.setItem(storageKey, JSON.stringify(session));
    store.setSession(session);
  }

  async function restoreSession() {
    store.setStatus("restoring");
    const persisted = safeJsonParse<PersistedSession | null>(
      localStorage.getItem(storageKey),
      null
    );

    if (!persisted?.refreshToken) {
      store.clearSession();
      return;
    }

    try {
      store.setSession(persisted);
      await refreshSession();
    } catch {
      store.clearSession();
    }
  }

  async function logout() {
    try {
      await fetch(`${baseUrl}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: store.refreshToken })
      });
    } finally {
      localStorage.removeItem(storageKey);
      store.clearSession();
    }
  }

  useEffect(() => {
    void restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, storageKey]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...store,
      login,
      logout,
      refreshSession,
      restoreSession,
      hasRole: (...roles) =>
        !!store.user?.roleName && roles.includes(store.user.roleName)
    }),
    [store, tenant]
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
