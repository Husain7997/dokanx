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

export function getSearchStatus() {
  return request<{
    data?: {
      lastRunAt?: string | null;
      totalDocs?: number;
      logs?: Array<Record<string, unknown>>;
    };
  }>("/search/status");
}

export function triggerFullReindex() {
  return request<{ data?: JsonValue; message?: string }>("/search/reindex", {
    method: "POST",
  });
}

export function triggerDeltaReindex() {
  return request<{ data?: JsonValue; message?: string }>("/search/reindex-delta", {
    method: "POST",
  });
}

export function getSearchTrending(params?: { days?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.days) query.set("days", String(params.days));
  if (params?.limit) query.set("limit", String(params.limit));
  const suffix = query.toString();
  return request<{ data?: Array<{ query?: string; count?: number }>; count?: number }>(
    `/search/trending${suffix ? `?${suffix}` : ""}`
  );
}

export function getSearchNoResults(params?: { days?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.days) query.set("days", String(params.days));
  if (params?.limit) query.set("limit", String(params.limit));
  const suffix = query.toString();
  return request<{ data?: Array<{ query?: string; count?: number }>; count?: number }>(
    `/search/no-results${suffix ? `?${suffix}` : ""}`
  );
}

export function getSearchConversion(params?: { days?: number }) {
  const query = new URLSearchParams();
  if (params?.days) query.set("days", String(params.days));
  const suffix = query.toString();
  return request<{
    data?: {
      totalSearches?: number;
      addToCart?: number;
      checkout?: number;
      addToCartRate?: number;
      checkoutRate?: number;
    };
  }>(`/search/conversion${suffix ? `?${suffix}` : ""}`);
}
