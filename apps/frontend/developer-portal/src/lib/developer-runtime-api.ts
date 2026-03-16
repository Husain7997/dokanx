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

export function getDeveloperProfile() {
  return request<{ data?: JsonValue }>("/developer/me");
}

export function updateDeveloperProfile(payload: { organizationName?: string; website?: string }) {
  return request<{ data?: JsonValue; message?: string }>("/developer/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listApps() {
  return request<{ data?: JsonValue[] }>("/developer/apps");
}

export function createApp(payload: {
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
}) {
  return request<{ data?: JsonValue; clientSecret?: string; message?: string }>("/developer/apps", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteApp(appId: string) {
  return request<{ message?: string }>(`/developer/apps/${appId}`, {
    method: "DELETE",
  });
}

export function listApiKeys() {
  return request<{ data?: JsonValue[] }>("/developer/api-keys");
}

export function createApiKey(payload: {
  name?: string;
  permissions: string[];
  usageLimit?: number | null;
  appId?: string | null;
}) {
  return request<{ data?: JsonValue; secret?: string; message?: string }>("/developer/api-keys", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function revokeApiKey(keyId: string) {
  return request<{ message?: string }>(`/developer/api-keys/${keyId}`, {
    method: "DELETE",
  });
}

export function listWebhooks() {
  return request<{ data?: JsonValue[] }>("/developer/webhooks");
}

export function createWebhook(payload: { url: string; events: string[]; appId?: string | null }) {
  return request<{ data?: JsonValue; secret?: string; message?: string }>("/developer/webhooks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteWebhook(webhookId: string) {
  return request<{ message?: string }>(`/developer/webhooks/${webhookId}`, {
    method: "DELETE",
  });
}

export function getUsageAnalytics() {
  return request<{ data?: JsonValue[] }>("/developer/analytics");
}

export function listMarketplaceApps() {
  return request<{ data?: JsonValue[] }>("/marketplace/apps");
}

export function publishMarketplaceApp(payload: {
  appId: string;
  tagline?: string;
  description?: string;
  categories?: string[];
}) {
  return request<{ data?: JsonValue; message?: string }>("/marketplace/apps/publish", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
