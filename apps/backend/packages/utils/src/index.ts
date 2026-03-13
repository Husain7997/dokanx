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

function isIpAddress(host: string) {
  const ipv4 =
    /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  if (ipv4.test(host)) return true;
  return host.includes(":");
}

export function resolveTenantFromHostname(hostname: string): TenantResolution {
  const host = hostname.split(":")[0].toLowerCase();
  const localSuffixes = ["localhost", "local", "test"];

  const isLocalRoot = localSuffixes.includes(host);
  const localSuffix = localSuffixes.find((suffix) => host.endsWith(`.${suffix}`));

  if (localSuffix) {
    const parts = host.split(".");
    return { hostname: host, mode: "subdomain", tenantKey: parts[0] };
  }

  if (isLocalRoot || isIpAddress(host)) {
    return { hostname: host, mode: "root", tenantKey: null };
  }

  const parts = host.split(".");

  if (parts.length > 2) {
    return { hostname: host, mode: "subdomain", tenantKey: parts[0] };
  }

  if (parts.length >= 2) {
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

function normalizeApiBaseUrl(value?: string) {
  if (!value) {
    return "http://localhost:5001/api";
  }
  const trimmed = value.replace(/\/$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

export function getApiBaseUrl(explicitBaseUrl?: string) {
  return normalizeApiBaseUrl(
    explicitBaseUrl ||
      process.env.E2E_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_URL ||
      "http://localhost:5001/api"
  );
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
