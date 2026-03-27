"use client";

import { useAuthStore } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

type JsonValue = Record<string, unknown>;

type ProductResponse = {
  message?: string;
  data?: {
    _id?: string;
    name?: string;
    category?: string;
    price?: number;
    stock?: number;
  } & JsonValue;
  product?: {
    _id?: string;
    name?: string;
    category?: string;
    price?: number;
    stock?: number;
  } & JsonValue;
};

type ProductListResponse = {
  message?: string;
  count?: number;
  data?: Array<{
    _id?: string;
    name?: string;
    category?: string;
    price?: number;
    stock?: number;
    isActive?: boolean;
  } & JsonValue>;
};

type ThemeResponse = {
  message?: string;
  data?: Array<Record<string, unknown>>;
};

type TeamMemberResponse = {
  message?: string;
  data?: Array<{
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
    permissionOverrides?: string[];
  } & JsonValue>;
};

type MutationResponse = {
  message?: string;
  data?: JsonValue;
  invite?: {
    inviteUrl?: string;
    expiresAt?: string;
    emailSent?: boolean;
  };
};

type InventoryAdjustResponse = {
  message?: string;
  ledger?: JsonValue;
};

type ShopSettingsResponse = {
  message?: string;
  data?: {
    name?: string;
    supportEmail?: string;
    whatsapp?: string;
    payoutSchedule?: string;
    logoUrl?: string;
    brandPrimaryColor?: string;
    brandAccentColor?: string;
    storefrontDomain?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    country?: string;
    vatRate?: number;
    defaultDiscountRate?: number;
  } & JsonValue;
};

type CustomerListResponse = {
  data?: Array<{
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
    createdAt?: string;
    orderCount?: number;
    totalSpend?: number;
    totalDue?: number;
    creditSales?: number;
    globalCustomerId?: string;
  } & JsonValue>;
};

type ShopSummaryResponse = {
  data?: {
    sales?: {
      totalSales?: number;
      totalOrders?: number;
    };
    settlements?: {
      settledAmount?: number;
      totalSettlements?: number;
    };
  } & JsonValue;
};

type SettlementResponse = {
  data?: Array<{
    _id?: string;
    totalAmount?: number;
    netAmount?: number;
    status?: string;
    createdAt?: string;
  } & JsonValue>;
};

type WalletSummaryResponse = {
  data?: {
    balance?: number;
    updatedAt?: string;
  } & JsonValue;
};

type WalletLedgerResponse = {
  data?: Array<{
    _id?: string;
    amount?: number;
    type?: string;
    referenceId?: string;
    createdAt?: string;
  } & JsonValue>;
};

type WalletReportResponse = {
  data?: {
    totalIncome?: number;
    totalExpense?: number;
    totalCheque?: number;
    totalDue?: number;
    profitLoss?: number;
    rows?: Array<Record<string, unknown>>;
  } & JsonValue;
};

type ClaimResponse = {
  data?: Array<{
    _id?: string;
    orderId?: string;
    productId?: string;
    customerId?: string;
    status?: string;
    type?: string;
    resolutionType?: string | null;
    reason?: string;
    createdAt?: string;
    fraudFlags?: string[];
  } & JsonValue>;
};

type CarrierResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    supportsTracking?: boolean;
  } & JsonValue>;
};

type TrackingResponse = {
  data?: {
    trackingNumber?: string;
    carrier?: string;
    status?: string;
    events?: Array<{
      status?: string;
      message?: string;
      location?: string;
      geo?: { lat?: number; lng?: number };
      timestamp?: string;
    }>;
  } & JsonValue;
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

type ReviewListResponse = {
  data?: Array<{
    _id?: string;
    productId?: string;
    reviewerName?: string;
    rating?: number;
    message?: string;
    status?: string;
    createdAt?: string;
  } & JsonValue>;
};

type PaymentAttemptResponse = {
  data?: Array<{
    _id?: string;
    order?: string;
    gateway?: string;
    providerPaymentId?: string;
    amount?: number;
    status?: string;
    createdAt?: string;
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
    events?: Array<{
      status?: string;
      message?: string;
      location?: string;
      geo?: { lat?: number; lng?: number };
      timestamp?: string;
    }>;
  } & JsonValue>;
  nextCursor?: string | null;
};

type OrderListResponse = {
  data?: Array<{
    _id?: string;
    status?: string;
    totalAmount?: number;
    createdAt?: string;
    contact?: { phone?: string; email?: string } & JsonValue;
    user?: { name?: string; email?: string; phone?: string } & JsonValue;
    items?: Array<{
      product?: { name?: string; price?: number } & JsonValue;
      quantity?: number;
      price?: number;
    } & JsonValue>;
  } & JsonValue>;
};

type InventoryListResponse = {
  data?: Array<{
    _id?: string;
    productId?: string;
    available?: number;
    reorderPoint?: number;
    updatedAt?: string;
  } & JsonValue>;
};

type AgentMeResponse = {
  data?: {
    _id?: string;
    agentCode?: string;
    referralLink?: string;
    clickCount?: number;
    shopConversionCount?: number;
    totalEarnings?: number;
    status?: string;
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

  const payload = (await response.json().catch(() => null)) as (JsonValue & { message?: string; data?: unknown }) | null;
  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload as T;
}

export function createProduct(payload: {
  name: string;
  category: string;
  price: number;
  stock: number;
}) {
  return request<ProductResponse>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listShopProducts(shopId: string) {
  return request<ProductListResponse>(`/products/shop/${shopId}`);
}

export function updateProduct(productId: string, payload: {
  name: string;
  category: string;
  price: number;
  stock: number;
}) {
  return request<ProductResponse>(`/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(productId: string) {
  return request<MutationResponse>(`/products/${productId}`, {
    method: "DELETE",
  });
}

export function adjustInventory(payload: {
  product: string;
  quantity: number;
  note?: string;
}) {
  return request<InventoryAdjustResponse>("/inventory/adjust", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listThemes() {
  return request<ThemeResponse>("/themes");
}

export function applyTheme(themeId: string) {
  return request<MutationResponse>("/themes/apply", {
    method: "POST",
    body: JSON.stringify({ themeId }),
  });
}

export function applyThemeWithOverrides(payload: {
  themeId: string;
  overrides?: JsonValue;
}) {
  return request<MutationResponse>("/themes/apply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetTheme() {
  return request<MutationResponse>("/themes/reset", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function updateShopSettings(payload: {
  name: string;
  supportEmail: string;
  whatsapp: string;
  payoutSchedule: string;
  logoUrl?: string;
  brandPrimaryColor?: string;
  brandAccentColor?: string;
  storefrontDomain?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  vatRate?: number;
  defaultDiscountRate?: number;
}) {
  return request<ShopSettingsResponse>("/shops/me/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getShopSettings() {
  return request<ShopSettingsResponse>("/shops/me/settings");
}

export function listTeamMembers() {
  return request<TeamMemberResponse>("/shops/me/team");
}

export function listCustomers() {
  return request<CustomerListResponse>("/shops/me/customers");
}

export function addTeamMember(payload: {
  name: string;
  email: string;
  phone?: string;
  role: string;
  permissions: string[];
}) {
  return request<MutationResponse>("/shops/me/team", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTeamMember(userId: string, payload: {
  role?: string;
  permissions?: string[];
  resendInvite?: boolean;
}) {
  return request<MutationResponse>(`/shops/me/team/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function acceptInvitation(payload: {
  token: string;
  password: string;
  name?: string;
}) {
  return request<{
    accessToken?: string;
    token?: string;
    refreshToken?: string;
    refreshTokenExpiresAt?: string;
    user?: JsonValue;
    message?: string;
  }>("/auth/invitations/accept", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listAnalyticsSnapshots(query: {
  metricType?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const search = new URLSearchParams();
  if (query.metricType) search.set("metricType", query.metricType);
  if (query.dateFrom) search.set("dateFrom", query.dateFrom);
  if (query.dateTo) search.set("dateTo", query.dateTo);
  return request<{ data?: Array<Record<string, unknown>> }>(`/analytics/warehouse${search.toString() ? `?${search.toString()}` : ""}`);
}

export function buildAnalyticsSnapshots(payload: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return request<{ success?: boolean }>("/analytics/warehouse/build", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listCampaigns() {
  return request<{ data?: Array<Record<string, unknown>> }>("/marketing/campaigns");
}

export function createCampaign(payload: { name: string; type?: string }) {
  return request<{ data?: Record<string, unknown> }>("/marketing/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function openPosSession(payload: { openingBalance?: number }) {
  return request<MutationResponse>("/pos/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function closePosSession(sessionId: string, payload: { closingBalance?: number }) {
  return request<MutationResponse>(`/pos/sessions/${sessionId}/close`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createPosOrder(payload: {
  items: Array<{ product: string; quantity: number }>;
}) {
  return request<MutationResponse>("/pos/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getProductByBarcode(barcode: string, shopId: string) {
  return request<{ data?: JsonValue }>(`/products/barcode/${barcode}?shopId=${encodeURIComponent(shopId)}`);
}

export function getShopSummary() {
  return request<ShopSummaryResponse>("/report/shop/summary");
}

export function getShopSettlements() {
  return request<SettlementResponse>("/report/shop/settlements");
}

export function getWalletSummary() {
  return request<WalletSummaryResponse>("/shop/wallet/summary");
}

export function listWalletLedger(limit = 50) {
  return listWalletLedgerFiltered({ limit });
}

export function listWalletLedgerFiltered(params: {
  limit?: number;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  if (params.type) search.set("type", params.type);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  return request<WalletLedgerResponse>(`/shop/wallet/ledger?${search.toString()}`);
}

export function topupWallet(amount: number) {
  return request<MutationResponse>("/shop/wallet/topup", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export function transferWallet(payload: { toShopId: string; amount: number }) {
  return request<MutationResponse>("/shop/wallet/transfer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getWalletReport(params: {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  customerId?: string;
  walletType?: string;
} = {}) {
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.type) search.set("type", params.type);
  if (params.customerId) search.set("customerId", params.customerId);
  if (params.walletType) search.set("walletType", params.walletType);
  return request<WalletReportResponse>(`/shop/wallet/reports${search.toString() ? `?${search.toString()}` : ""}`);
}

export function createCreditSale(payload: {
  orderId: string;
  customerId: string;
  shopId?: string;
  amount: number;
}) {
  return request<MutationResponse>("/credit/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCustomerDue(customerId: string) {
  return request<{
    data?: {
      customerId?: string;
      totalDue?: number;
      shopWiseDue?: Array<{ shopId?: string; amount?: number }>;
      sales?: Array<Record<string, unknown>>;
    } & JsonValue;
  }>(`/credit/customers/${encodeURIComponent(customerId)}`);
}

export function getCustomerProfile(globalCustomerId: string) {
  return request<{
    data?: {
      customer?: {
        _id?: string;
        name?: string;
        email?: string;
        phone?: string;
        globalCustomerId?: string;
      };
      orders?: Array<Record<string, unknown>>;
      dues?: Array<Record<string, unknown>>;
      payments?: Array<Record<string, unknown>>;
      claims?: Array<Record<string, unknown>>;
      walletSummary?: {
        totalIncome?: number;
        totalExpense?: number;
        totalDue?: number;
        totalDueSettlements?: number;
      };
    } & JsonValue;
  }>(`/customers/${encodeURIComponent(globalCustomerId)}`);
}

export function payCustomerDue(payload: {
  creditSaleId?: string;
  customerId?: string;
  amount: number;
  referenceId: string;
  metadata?: JsonValue;
}) {
  return request<MutationResponse>("/credit/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listShopClaims(shopId: string) {
  return request<ClaimResponse>(`/claims/shop/${encodeURIComponent(shopId)}`);
}

export function updateClaimStatus(claimId: string, payload: {
  status: string;
  resolutionType?: "repair" | "replacement" | "refund";
  amount?: number;
  decisionNote?: string;
}) {
  return request<{ data?: JsonValue }>(`/claims/${encodeURIComponent(claimId)}/status`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listCarriers() {
  return request<CarrierResponse>("/shipping/carriers");
}

export function listShipments(
  params: { limit?: number; dateFrom?: string; dateTo?: string; cursor?: string } | number = 50
) {
  const resolved =
    typeof params === "number"
      ? { limit: params }
      : { limit: params.limit, dateFrom: params.dateFrom, dateTo: params.dateTo, cursor: params.cursor };
  const search = new URLSearchParams();
  if (resolved.limit) search.set("limit", String(resolved.limit));
  if (resolved.dateFrom) search.set("dateFrom", resolved.dateFrom);
  if (resolved.dateTo) search.set("dateTo", resolved.dateTo);
  if (resolved.cursor) search.set("cursor", resolved.cursor);
  return request<ShipmentResponse>(`/shipping/shipments?${search.toString()}`);
}

export function createShipment(payload: { orderId: string; carrier: string }) {
  return request<{ data?: JsonValue }>("/shipping/shipments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function trackShipment(trackingNumber: string) {
  return request<TrackingResponse>(`/shipping/track/${encodeURIComponent(trackingNumber)}`);
}

export async function downloadShipmentLabelPdf(trackingNumber: string) {
  const response = await fetch(`${getApiBaseUrl()}/shipping/labels/${encodeURIComponent(trackingNumber)}/pdf`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || "Unable to download label.");
  }
  return response.blob();
}

export function listMarketplaceApps() {
  return request<MarketplaceAppsResponse>("/marketplace/apps");
}

export function listShopReviews(status = "ALL", limit = 50) {
  const search = new URLSearchParams({ status, limit: String(limit) });
  return request<ReviewListResponse>(`/shops/me/reviews?${search.toString()}`);
}

export function listShopPayments(status = "ALL", limit = 50) {
  const search = new URLSearchParams({ status, limit: String(limit) });
  return request<PaymentAttemptResponse>(`/shops/me/payments?${search.toString()}`);
}

export function listOrders(limit?: number) {
  const search = new URLSearchParams();
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    search.set("limit", String(limit));
  }
  return request<OrderListResponse>(`/orders${search.toString() ? `?${search.toString()}` : ""}`);
}

export function getAgentMe() {
  return request<AgentMeResponse>("/agents/me");
}

export function listInventory(limit?: number) {
  const search = new URLSearchParams();
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    search.set("limit", String(limit));
  }
  return request<InventoryListResponse>(`/inventory${search.toString() ? `?${search.toString()}` : ""}`);
}

export function updateOrderStatus(orderId: string, status: string) {
  return request<{ message?: string; order?: JsonValue }>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function refundPayment(orderId: string, amount: number, reason?: string) {
  return request<{ message?: string; refundedAmount?: number }>(`/payments/refund`, {
    method: "POST",
    body: JSON.stringify({ orderId, amount, reason }),
  });
}

export function listNotifications() {
  return request<{
    data?: Array<{
      _id?: string;
      title?: string;
      message?: string;
      type?: string;
      isRead?: boolean;
      createdAt?: string;
      metadata?: JsonValue;
    } & JsonValue>;
  }>("/notifications");
}

export function markNotificationRead(notificationId: string) {
  return request<{ data?: JsonValue }>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsRead() {
  return request<{ updated?: number }>("/notifications/read-all", {
    method: "PATCH",
  });
}

export function registerPushToken(token: string) {
  return request<{ success?: boolean }>("/notifications/push-tokens/register", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function unregisterPushToken(token: string) {
  return request<{ success?: boolean }>("/notifications/push-tokens/unregister", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function getNotificationSettings() {
  return request<{
    data?: {
      channels?: {
        email?: boolean;
        sms?: boolean;
        push?: boolean;
        inApp?: boolean;
        webhook?: boolean;
      };
      categories?: {
        order?: boolean;
        payment?: boolean;
        inventory?: boolean;
        marketing?: boolean;
        system?: boolean;
      };
    } & JsonValue;
  }>("/notifications/settings");
}

export function updateNotificationSettings(payload: {
  channels?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    inApp?: boolean;
    webhook?: boolean;
  };
  categories?: {
    order?: boolean;
    payment?: boolean;
    inventory?: boolean;
    marketing?: boolean;
    system?: boolean;
  };
}) {
  return request<{
    data?: {
      channels?: Record<string, boolean>;
      categories?: Record<string, boolean>;
    } & JsonValue;
  }>("/notifications/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
