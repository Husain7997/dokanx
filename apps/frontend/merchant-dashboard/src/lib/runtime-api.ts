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
}) {
  return request<ShopSettingsResponse>("/shops/me/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
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

export function listCarriers() {
  return request<CarrierResponse>("/shipping/carriers");
}

export function trackShipment(trackingNumber: string) {
  return request<TrackingResponse>(`/shipping/track/${encodeURIComponent(trackingNumber)}`);
}

export function listMarketplaceApps() {
  return request<MarketplaceAppsResponse>("/marketplace/apps");
}
