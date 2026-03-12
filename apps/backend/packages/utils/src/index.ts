import type { AuthRole, TenantConfig, TenantResolution } from "@dokanx/types";

export const storageKeys = {
  session: "dokanx.session",
  tenant: "dokanx.tenant",
  ui: "dokanx.ui"
} as const;

export function toRole(value: string | undefined | null): AuthRole {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "owner") return "merchant";
  if (normalized === "admin") return "admin";
  if (normalized === "staff") return "staff";
  return "customer";
}

export function resolveTenantFromHostname(hostname: string): TenantResolution {
  const host = hostname.split(":")[0].toLowerCase();
  const parts = host.split(".");

  if (parts.length > 2) {
    return { hostname: host, mode: "subdomain", tenantKey: parts[0] };
  }

  if (!host.includes("localhost") && parts.length >= 2) {
    return { hostname: host, mode: "custom-domain", tenantKey: host };
  }

  return { hostname: host, mode: "root", tenantKey: null };
}

export function buildTenantHeaders(tenant?: Partial<TenantConfig> | null) {
  if (!tenant?.id && !tenant?.slug) {
    return {};
  }

  return {
    ...(tenant.id ? { "x-tenant-id": tenant.id } : {}),
    ...(tenant.slug ? { "x-tenant-slug": tenant.slug } : {})
  };
}

export function getApiBaseUrl(explicitBaseUrl?: string) {
  return explicitBaseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function isServer() {
  return typeof window === "undefined";
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
