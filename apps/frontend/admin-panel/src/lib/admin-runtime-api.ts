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
    disputeStatus?: string;
    disputeReason?: string;
    adminNotes?: string;
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
    performedBy?: { name?: string; email?: string } & JsonValue;
    meta?: JsonValue;
    createdAt?: string;
  } & JsonValue>;
};

type AdminReviewResponse = {
  data?: Array<{
    _id?: string;
    productId?: string;
    reviewerName?: string;
    rating?: number;
    message?: string;
    status?: string;
    createdAt?: string;
  }>;
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

type PaymentGatewayResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    status?: string;
    supportsRefunds?: boolean;
  } & JsonValue>;
};

type ProductListResponse = {
  data?: Array<{
    _id?: string;
    name?: string;
    price?: number;
    stock?: number;
    shopId?: string;
    moderationStatus?: string;
    moderationNote?: string;
  } & JsonValue>;
};

type ShipmentResponse = {
  data?: Array<{
    _id?: string;
    orderId?: string;
    trackingNumber?: string;
    carrier?: string;
    status?: string;
    createdAt?: string;
  } & JsonValue>;
};

type IpBlockResponse = {
  data?: Array<{
    _id?: string;
    ip?: string;
    reason?: string;
    status?: string;
    createdAt?: string;
  } & JsonValue>;
};

type EtaSettingsResponse = {
  data?: {
    basePerKm?: number;
    minEta?: number;
    fallbackEta?: number;
    trafficFactors?: Array<{ maxDistanceKm?: number; minutes?: number }>;
    distanceBrackets?: Array<{ maxDistanceKm?: number; minutes?: number }>;
  } & JsonValue;
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

export function updateOrderDispute(orderId: string, payload: { disputeStatus?: string; adminNotes?: string; disputeReason?: string }) {
  return request<{ message?: string; order?: JsonValue }>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
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

export function listPaymentGateways() {
  return request<PaymentGatewayResponse>("/payments/gateways");
}

export function listProducts() {
  return request<ProductListResponse>("/products");
}

export function moderateProduct(productId: string, payload: { status: string; note?: string }) {
  return request<{ message?: string }>(`/admin/products/${productId}/moderate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateShopCommission(shopId: string, commissionRate: number) {
  return request<{ message?: string }>(`/admin/shops/${shopId}/commission`, {
    method: "PUT",
    body: JSON.stringify({ commissionRate }),
  });
}

export function listShipments(limit = 100) {
  const search = new URLSearchParams({ limit: String(limit) });
  return request<ShipmentResponse>(`/shipping/shipments?${search.toString()}`);
}

export function adjustWallet(payload: { shopId: string; amount: number; reason?: string }) {
  return request<{ success?: boolean; balance?: number }>(`/admin/adjustments/adjust`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refundWallet(payload: { shopId: string; amount: number; reason?: string }) {
  return request<{ success?: boolean; balance?: number }>(`/admin/adjustments/refund`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function freezeWallet(shopId: string) {
  return request<{ message?: string }>(`/admin/wallets/${shopId}/freeze`, {
    method: "POST",
  });
}

export function unfreezeWallet(shopId: string) {
  return request<{ message?: string }>(`/admin/wallets/${shopId}/unfreeze`, {
    method: "POST",
  });
}

export function listIpBlocks() {
  return request<IpBlockResponse>("/admin/security/ip-blocks");
}

export function blockIp(payload: { ip: string; reason?: string }) {
  return request<{ message?: string }>(`/admin/security/ip-blocks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function unblockIp(id: string) {
  return request<{ message?: string }>(`/admin/security/ip-blocks/${id}/unblock`, {
    method: "POST",
  });
}

export function getEtaSettings() {
  return request<EtaSettingsResponse>("/settings/eta");
}

export function updateEtaSettings(payload: {
  basePerKm: number;
  minEta: number;
  fallbackEta: number;
  trafficFactors: Array<{ maxDistanceKm: number; minutes: number }>;
  distanceBrackets: Array<{ maxDistanceKm: number; minutes: number }>;
}) {
  return request<EtaSettingsResponse>("/admin/settings/eta", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function blockUser(userId: string) {
  return request<{ message?: string }>(`/admin/users/${userId}/block`, {
    method: "PUT",
  });
}

export function unblockUser(userId: string) {
  return request<{ message?: string }>(`/admin/users/${userId}/unblock`, {
    method: "PUT",
  });
}

export function approveShop(shopId: string) {
  return request<{ message?: string }>(`/admin/shops/${shopId}/approve`, {
    method: "PUT",
  });
}

export function suspendShop(shopId: string) {
  return request<{ message?: string }>(`/admin/shops/${shopId}/suspend`, {
    method: "PUT",
  });
}

export function listProductReviews(status = "PENDING") {
  const search = new URLSearchParams({ status });
  return request<AdminReviewResponse>(`/admin/reviews?${search.toString()}`);
}

export function approveProductReview(reviewId: string) {
  return request<{ message?: string }>(`/admin/reviews/${reviewId}/approve`, {
    method: "POST",
  });
}

export function rejectProductReview(reviewId: string) {
  return request<{ message?: string }>(`/admin/reviews/${reviewId}/reject`, {
    method: "POST",
  });
}
