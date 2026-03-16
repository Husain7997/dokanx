"use client";

import { useAuthStore } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

type JsonValue = Record<string, unknown>;

function getHeaders() {
  const store = useAuthStore.getState();
  return {
    "Content-Type": "application/json",
    ...(store.accessToken ? { Authorization: `Bearer ${store.accessToken}` } : {}),
    ...(store.tenant?.id ? { "x-tenant-id": store.tenant.id } : {}),
    ...(store.tenant?.slug ? { "x-tenant-slug": store.tenant.slug } : {}),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as (JsonValue & { message?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload as T;
}

export function listIntegrations() {
  return request<{ data?: JsonValue[] }>("/admin/integrations");
}

export function saveIntegration(payload: {
  provider: string;
  publicData?: JsonValue;
  secret?: string;
  status?: string;
}) {
  return request<{ data?: JsonValue; message?: string }>("/admin/integrations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
