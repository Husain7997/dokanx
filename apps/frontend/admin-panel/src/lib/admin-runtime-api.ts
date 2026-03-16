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

type AdminMetricsResponse = {
  shops?: number;
  orders?: number;
};

type AdminKpiResponse = {
  data?: {
    totalOrders?: number;
    revenue?: number;
    settled?: number;
  } & JsonValue;
};

type AdminUserResponse = {
  data?: Array<{
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
    isBlocked?: boolean;
    shopId?: JsonValue;
  } & JsonValue>;
};

type AdminShopResponse = {
  data?: Array<{
    _id?: string;
    name?: string;
    domain?: string;
    slug?: string;
    isActive?: boolean;
    owner?: { name?: string; email?: string } & JsonValue;
    createdAt?: string;
  } & JsonValue>;
};

type AdminOrderResponse = {
  data?: Array<{
    _id?: string;
    status?: string;
    totalAmount?: number;
    shop?: { name?: string } & JsonValue;
    user?: { name?: string; email?: string } & JsonValue;
    createdAt?: string;
  } & JsonValue>;
};

type AdminAuditResponse = {
  data?: Array<{
    _id?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    createdAt?: string;
  } & JsonValue>;
};

type AdminSettlementResponse = {
  data?: Array<{
    _id?: string;
    shopId?: string;
    totalAmount?: number;
    status?: string;
    createdAt?: string;
  } & JsonValue>;
};

type CarrierResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    supportsTracking?: boolean;
  } & JsonValue>;
};

type HealthResponse = {
  status?: string;
  uptime?: number;
  timestamp?: string;
  message?: string;
};

type MarketplaceAppsResponse = {
  data?: Array<{
    _id?: string;
    name?: string;
    tagline?: string;
    description?: string;
    category?: string;
  } & JsonValue>;
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

export function getAdminMetrics() {
  return request<AdminMetricsResponse>("/admin/metrics");
}

export function getAdminKpi() {
  return request<AdminKpiResponse>("/report/admin/kpi");
}

export function listAdminUsers() {
  return request<AdminUserResponse>("/admin/users");
}

export function listMerchants() {
  return request<AdminUserResponse>("/admin/merchants");
}

export function listShops() {
  return request<AdminShopResponse>("/admin/shops");
}

export function listOrders() {
  return request<AdminOrderResponse>("/admin/orders");
}

export function listAuditLogs() {
  return request<AdminAuditResponse>("/admin/audit-logs");
}

export function listSettlements() {
  return request<AdminSettlementResponse>("/admin/settlements");
}

export function listCarriers() {
  return request<CarrierResponse>("/shipping/carriers");
}

export function getSystemHealth() {
  return request<HealthResponse>("/system/health");
}

export function listMarketplaceApps() {
  return request<MarketplaceAppsResponse>("/marketplace/apps");
}
