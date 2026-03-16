"use client";

import { useAuthStore } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

type JsonValue = Record<string, unknown>;

type KpiResponse = {
  data?: {
    totalRevenue?: number;
    totalCommission?: number;
    totalPayout?: number;
    totalSettlements?: number;
  } & JsonValue;
  message?: string;
};

type RevenueVsPayoutResponse = {
  data?: Array<{
    _id?: { day?: string };
    revenue?: number;
    payout?: number;
  } & JsonValue>;
};

type PayoutAlertsResponse = {
  data?: Array<JsonValue>;
};

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

export function getFinanceKpis() {
  return request<KpiResponse>("/admin/finance/kpi");
}

export function getRevenueVsPayout() {
  return request<RevenueVsPayoutResponse>("/admin/finance/revenue-vs-payout");
}

export function getPayoutAlerts() {
  return request<PayoutAlertsResponse>("/admin/finance/payout-alerts");
}
