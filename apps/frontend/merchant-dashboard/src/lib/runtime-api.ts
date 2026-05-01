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

type ThemeStateResponse = {
  message?: string;
  data?: Record<string, unknown>;
};

type ThemeDraftResponse = {
  message?: string;
  data?: {
    draft?: Record<string, unknown> | null;
    published?: Record<string, unknown> | null;
    draftUpdatedAt?: string | null;
    publishedAt?: string | null;
    history?: Array<Record<string, unknown>>;
    access?: Record<string, unknown>;
    mediaAssets?: Array<Record<string, unknown>>;
    customThemes?: Array<Record<string, unknown>>;
    catalog?: Array<Record<string, unknown>>;
    marketplace?: Record<string, unknown>;
    experiment?: Record<string, unknown>;
  };
};

type ThemeMediaResponse = {
  message?: string;
  data?: {
    asset?: Record<string, unknown>;
    assets?: Array<Record<string, unknown>>;
    access?: Record<string, unknown>;
  };
};

type CustomThemeResponse = {
  message?: string;
  data?: {
    themes?: Array<Record<string, unknown>>;
    catalog?: Array<Record<string, unknown>>;
    access?: Record<string, unknown>;
    theme?: Record<string, unknown>;
  };
};

type ThemeMarketplaceResponse = {
  message?: string;
  data?: {
    marketplace?: Record<string, unknown>;
    catalog?: Array<Record<string, unknown>>;
    access?: Record<string, unknown>;
  };
};

type ThemeHistoryResponse = {
  message?: string;
  data?: {
    history?: Array<Record<string, unknown>>;
    publishedAt?: string | null;
    experiment?: Record<string, unknown>;
  };
};

type ThemeExperimentResponse = {
  message?: string;
  data?: {
    experiment?: Record<string, unknown>;
    catalog?: Array<Record<string, unknown>>;
  };
};

type TeamActivityResponse = {
  data?: Array<{
    id?: string;
    action?: string;
    actorId?: string | null;
    actorName?: string;
    actorRole?: string;
    createdAt?: string | null;
    targetType?: string;
    targetId?: string | null;
    permissionsMode?: string;
    permissionOverrides?: string[];
    before?: JsonValue | null;
    after?: JsonValue | null;
    inviteIssued?: boolean;
  } & JsonValue>;
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
    merchantTier?: string;
    themeAccess?: Record<string, unknown>;
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

type DeliveryConfigResponse = {
  data?: {
    groupingRadiusKm?: number;
    sameZoneCharge?: number;
    groupedCharge?: number;
    externalCarrierCharge?: number;
  } & JsonValue;
};

type DeliveryEstimateResponse = {
  data?: {
    deliveryCharge?: number;
    totalDistance?: number;
    strategy?: string;
    route?: Array<{
      shopId?: string;
      label?: string;
      city?: string;
      coordinates?: { lat?: number; lng?: number };
    }>;
  } & JsonValue;
};

type SearchSuggestionResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    entityType?: string;
    score?: number;
    reason?: string;
  }>;
  count?: number;
};

type PublicShopListResponse = {
  data?: Array<{
    _id?: string;
    name?: string;
    slug?: string;
    logoUrl?: string;
    category?: string;
    rating?: number;
    city?: string;
    country?: string;
  } & JsonValue>;
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

type MerchantAiCopilotResponse = {
  data?: {
    generatedAt?: string;
    rangeDays?: number;
    summary?: {
      currentRevenue?: number;
      previousRevenue?: number;
      revenueTrend?: number;
      projectedNext7Days?: number;
      paymentFailureRate?: number;
      lowStockCount?: number;
      riskyCreditCustomers?: number;
      fulfillmentBacklog?: number;
    };
    cards?: Array<{
      id?: string;
      title?: string;
      severity?: string;
      metric?: string;
      message?: string;
    }>;
    salesSeries?: Array<{
      label?: string;
      value?: number;
    }>;
    inventoryActions?: Array<{
      productId?: string;
      name?: string;
      currentStock?: number;
      reorderPoint?: number;
      suggestedRestock?: number;
      demandPerDay?: number;
      estimatedDaysLeft?: number | null;
      urgency?: string;
      reason?: string;
    }>;
    customerSegments?: Array<{
      segment?: string;
      count?: number;
      ratio?: number;
      description?: string;
    }>;
    creditInsights?: Array<{
      customerId?: string;
      customerName?: string;
      phone?: string;
      creditScore?: number;
      decision?: string;
      status?: string;
      creditLimit?: number;
      outstandingBalance?: number;
      availableCredit?: number;
      utilizationRate?: number;
      recommendedLimit?: number;
      riskLabel?: string;
      reasons?: string[];
    }>;
    paymentIntelligence?: {
      totalAttempts?: number;
      failedAttempts?: number;
      pendingAttempts?: number;
      failureRate?: number;
      gatewayBreakdown?: Array<{
        gateway?: string;
        total?: number;
        failed?: number;
        success?: number;
        pending?: number;
        failureRate?: number;
      }>;
      anomalies?: Array<{
        gateway?: string;
        severity?: string;
        message?: string;
      }>;
    };
    fulfillmentActions?: Array<{
      orderId?: string;
      status?: string;
      paymentStatus?: string;
      ageHours?: number;
      totalAmount?: number;
      priority?: string;
      suggestion?: string;
    }>;
  };
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
  source?: string;
}) {
  return request<InventoryAdjustResponse>("/inventory/adjust", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listThemes() {
  return request<ThemeResponse>("/themes");
}

export function getThemeCatalog() {
  return request<ThemeResponse>("/themes");
}

export function getThemeState() {
  return request<ThemeStateResponse>("/themes/current");
}

export function getThemeDraft() {
  return request<ThemeDraftResponse>("/themes/draft");
}

export function getThemeHistory() {
  return request<ThemeHistoryResponse>("/themes/history");
}

export function getThemeMedia() {
  return request<ThemeMediaResponse>("/themes/media");
}

export function getCustomThemes() {
  return request<CustomThemeResponse>("/themes/custom");
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

export function updateThemeConfig(payload: {
  themeId: string;
  themeConfig: JsonValue;
  mode?: "draft" | "publish";
}) {
  return request<ThemeStateResponse>("/themes/update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function rollbackThemeSnapshot(snapshotId: string) {
  return request<ThemeDraftResponse>("/themes/rollback", {
    method: "POST",
    body: JSON.stringify({ snapshotId }),
  });
}

export function updateThemeExperiment(payload: {
  experiment: {
    isEnabled?: boolean;
    name?: string;
    trafficSplit?: number;
    variants?: Array<{
      id?: string;
      label?: string;
      themeId?: string;
      config?: Record<string, unknown>;
    }>;
  };
}) {
  return request<ThemeExperimentResponse>("/themes/experiment", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createThemeMediaAsset(payload: {
  name: string;
  dataUrl: string;
  alt?: string;
  tags?: string[];
}) {
  return request<ThemeMediaResponse>("/themes/media", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteThemeMediaAsset(assetId: string) {
  return request<ThemeMediaResponse>(`/themes/media/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  });
}

export function createCustomTheme(payload: {
  theme: Record<string, unknown>;
}) {
  return request<CustomThemeResponse>("/themes/custom", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteCustomTheme(themeId: string) {
  return request<CustomThemeResponse>(`/themes/custom/${encodeURIComponent(themeId)}`, {
    method: "DELETE",
  });
}

export function exportCustomTheme(themeId: string) {
  return request<CustomThemeResponse>(`/themes/custom/${encodeURIComponent(themeId)}/export`);
}

export function installMarketplaceTheme(themeId: string) {
  return request<ThemeMarketplaceResponse>("/themes/marketplace/install", {
    method: "POST",
    body: JSON.stringify({ themeId }),
  });
}

export function toggleFavoriteTheme(themeId: string) {
  return request<ThemeMarketplaceResponse>("/themes/marketplace/favorite", {
    method: "POST",
    body: JSON.stringify({ themeId }),
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

export function listPublicShops() {
  return request<PublicShopListResponse>("/shops/public");
}

export function getDeliveryConfig() {
  return request<DeliveryConfigResponse>("/delivery/config");
}

export function updateDeliveryConfig(payload: {
  groupingRadiusKm?: number;
  sameZoneCharge?: number;
  groupedCharge?: number;
  externalCarrierCharge?: number;
}) {
  return request<DeliveryConfigResponse>("/delivery/config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function estimateDeliveryCharge(payload: {
  stops: Array<{
    label: string;
    city: string;
    coordinates: { lat: number; lng: number };
  }>;
  destination: {
    city: string;
    coordinates: { lat: number; lng: number };
  };
  orderId?: string;
}) {
  return request<DeliveryEstimateResponse>("/delivery/estimate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function searchAISuggestions(query: string, limit = 8) {
  return request<SearchSuggestionResponse>(`/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export function getMerchantAiCopilot(params: { range?: string } = {}) {
  const query = new URLSearchParams();
  if (params.range) query.set("range", params.range);
  const search = query.toString();
  return request<MerchantAiCopilotResponse>(`/ai/merchant-copilot${search ? `?${search}` : ""}`);
}

export function listTeamMembers() {
  return request<TeamMemberResponse>("/shops/me/team");
}

export function listTeamActivity() {
  return request<TeamActivityResponse>("/shops/me/team/activity");
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
  permissionsMode?: "replace" | "merge" | "remove";
}) {
  return request<MutationResponse>("/shops/me/team", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTeamMember(userId: string, payload: {
  role?: string;
  permissions?: string[];
  permissionsMode?: "replace" | "merge" | "remove";
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
  paymentType?: "cash" | "wallet" | "online" | "credit";
  customerId?: string;
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

export function upsertCreditPolicy(payload: {
  customerId: string;
  shopId?: string;
  creditLimit: number;
  status?: "ACTIVE" | "BLOCKED";
  source?: string;
}) {
  return request<MutationResponse>("/credit/limits", {
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

export function retryPayment(orderId: string, source?: string) {
  return request<{ message?: string; paymentId?: string; attemptNo?: number; amount?: number }>("/payments/retry", {
    method: "POST",
    body: JSON.stringify({ orderId, source }),
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
