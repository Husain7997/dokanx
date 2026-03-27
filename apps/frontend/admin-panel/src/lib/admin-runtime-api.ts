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

type AdminAnalyticsOverviewResponse = {
  data?: {
    dailySales?: Array<{ date?: string; gmv?: number; orders?: number; aov?: number }>;
    trend?: { current?: Array<{ label?: string; value?: number }> };
    wallet?: { credits?: number; debits?: number; net?: number; transactionCount?: number };
    shipments?: { total?: number; delivered?: number; failed?: number; successRate?: number };
    inventory?: { totalSkus?: number; lowStockCount?: number; outOfStockCount?: number; totalStock?: number };
    categorySplit?: Array<{ category?: string; revenue?: number; quantity?: number }>;
    channelSplit?: Array<{ channel?: string; gmv?: number; orders?: number }>;
    topProducts?: Array<{ productId?: string; name?: string; revenue?: number; quantity?: number }>;
    customerRepeatRate?: { totalCustomers?: number; repeatCustomers?: number; repeatRate?: number };
    conversionFunnel?: Array<{ stage?: string; count?: number; rate?: number }>;
  } & JsonValue;
};

type AdminRecommendationMetricsResponse = {
  data?: {
    windowDays?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    productViews?: number;
    sectionBreakdown?: Array<{
      section?: string;
      impressions?: number;
      clicks?: number;
      ctr?: number;
    }>;
    topClickedProducts?: Array<{ productId?: string; name?: string; slug?: string; clicks?: number }>;
  };
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

type AdminAgentResponse = {
  data?: Array<{
    _id?: string;
    agentCode?: string;
    status?: string;
    clickCount?: number;
    signupCount?: number;
    shopConversionCount?: number;
    totalEarnings?: number;
    totalShops?: number;
    referralLink?: string;
    userId?: {
      _id?: string;
      name?: string;
      email?: string;
      phone?: string;
    } & JsonValue;
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

type AdminAppsResponse = {
  data?: Array<{
    _id?: string;
    appId?: string;
    name?: string;
    tagline?: string;
    description?: string;
    categories?: string[];
    status?: string;
    appStatus?: string;
    installations?: number;
    sandboxMode?: boolean;
    installationStatus?: Array<{
      _id?: string;
      shopId?: string;
      status?: string;
      sandboxMode?: boolean;
    }>;
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

type ThresholdSettingsResponse = {
  data?: {
    warningStart?: number;
    warningEnd?: number;
    criticalStart?: number;
    criticalEnd?: number;
  } & JsonValue;
};

type CommissionRuleResponse = {
  data?: Array<{
    _id?: string;
    type?: string;
    rate?: number;
    category?: string;
    merchantTier?: string;
    campaignId?: string;
    isActive?: boolean;
  } & JsonValue>;
};

type DeliveryConfigResponse = {
  data?: {
    groupingRadiusKm?: number;
    sameZoneCharge?: number;
    groupedCharge?: number;
    externalCarrierCharge?: number;
  } & JsonValue;
};

type ClaimResponse = {
  data?: Array<{
    _id?: string;
    orderId?: string;
    productId?: string;
    customerId?: string;
    shopId?: string;
    type?: string;
    status?: string;
    resolutionType?: string | null;
    fraudFlags?: string[];
    createdAt?: string;
    reason?: string;
  } & JsonValue>;
};

type ClaimAnalyticsResponse = {
  data?: {
    totalClaims?: number;
    pending?: number;
    resolved?: number;
    refunds?: number;
  } & JsonValue;
};

type NotificationResponse = {
  data?: Array<{
    _id?: string;
    title?: string;
    message?: string;
    type?: string;
    isRead?: boolean;
    createdAt?: string;
    metadata?: JsonValue;
  } & JsonValue>;
};

type NotificationSettingsResponse = {
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
};

type FraudSignal = {
  code?: string;
  label?: string;
  weight?: number;
  value?: unknown;
  threshold?: unknown;
};

type FraudCase = {
  _id?: string;
  entityType?: string;
  entityId?: string;
  orderId?: string;
  paymentAttemptId?: string;
  userId?: string;
  userName?: string;
  shopId?: string;
  shopName?: string;
  score?: number;
  level?: "safe" | "medium" | "high";
  status?: string;
  reviewRequired?: boolean;
  source?: string;
  summary?: string;
  signals?: FraudSignal[];
  recommendedActions?: string[];
  metrics?: JsonValue;
  updatedAt?: string;
  createdAt?: string;
} & JsonValue;

type FraudOverviewResponse = {
  data?: {
    summary?: {
      cases?: number;
      openCases?: number;
      reviewRequired?: number;
      blockedUsers?: number;
      suspendedMerchants?: number;
      frozenWallets?: number;
      fraudRate?: number;
      paymentFailureRate?: number;
    } & JsonValue;
    flaggedOrders?: FraudCase[];
    suspiciousUsers?: Array<{
      userId?: string;
      userName?: string;
      score?: number;
      orderCount?: number;
      latestCaseAt?: string;
    } & JsonValue>;
    highRiskMerchants?: Array<{
      shopId?: string;
      shopName?: string;
      score?: number;
      caseCount?: number;
      latestCaseAt?: string;
    } & JsonValue>;
    alerts?: FraudCase[];
    analytics?: {
      totalOrders?: number;
      totalAttempts?: number;
      failedAttempts?: number;
      topSignals?: Array<{ code?: string; count?: number }>;
    } & JsonValue;
  };
};

type FraudAlertsResponse = {
  data?: FraudCase[];
};

type FraudReportsResponse = {
  data?: {
    totalOrders?: number;
    totalAttempts?: number;
    failedAttempts?: number;
    topSignals?: Array<{ code?: string; count?: number }>;
  } & JsonValue;
};

type FraudReviewResponse = {
  data?: FraudCase;
};

type AiRecommendationsResponse = {
  data?: Array<{
    type?: string;
    query?: string;
    items?: Array<{
      id?: string;
      name?: string;
      score?: number;
      reason?: string;
      price?: number;
    }>;
  }>;
};

type AiTrendingResponse = {
  data?: Array<{
    name?: string;
    velocity?: number;
    location?: string;
    changeLabel?: string;
  }>;
};

type AiSimilarProductsResponse = {
  data?: Array<{
    base?: string;
    items?: Array<{
      name?: string;
      similarity?: number;
      price?: number;
    }>;
  }>;
};

type AiDemandForecastResponse = {
  data?: {
    labels?: string[];
    actual?: number[];
    forecast?: number[];
  } & JsonValue;
};

type AiPricingInsightsResponse = {
  data?: Array<{
    product?: string;
    marketPrice?: number;
    yourPrice?: number;
    suggestion?: number;
    inventory?: number;
    velocity?: string;
    competitor?: string;
  }>;
};

type AiMerchantInsightsResponse = {
  data?: Array<{
    id?: string;
    title?: string;
    message?: string;
    badge?: "warning" | "info" | "success";
  }>;
};

type AiSearchIntelligenceResponse = {
  data?: Array<{
    query?: string;
    expansions?: string[];
    intent?: string;
  }>;
};

type AiLocationInsightsResponse = {
  data?: Array<{
    city?: string;
    picks?: string[];
    demandIndex?: number;
  }>;
};

type AiWarehouseOverviewResponse = {
  data?: {
    pipelines?: number;
    jobs?: number;
    tables?: number;
    eventsPerHour?: number;
    anomalyRate?: number;
    lastRefresh?: string;
  } & JsonValue;
};

type AiWarehouseCohortsResponse = {
  data?: Array<{
    cohort?: string;
    merchants?: number;
    retained?: number;
    retentionRate?: number;
  }>;
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

export function getAdminAnalyticsOverview(query: {
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const search = new URLSearchParams();
  if (query.dateFrom) search.set("dateFrom", query.dateFrom);
  if (query.dateTo) search.set("dateTo", query.dateTo);
  return request<AdminAnalyticsOverviewResponse>(`/admin/analytics/overview${search.toString() ? `?${search.toString()}` : ""}`);
}

export function buildAdminAnalyticsSnapshots(payload: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return request<{ success?: boolean }>("/admin/analytics/build", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAdminRecommendationMetrics(params?: { days?: string }) {
  const search = params ? new URLSearchParams(params).toString() : "";
  return request<AdminRecommendationMetricsResponse>(
    `/admin/recommendations/metrics${search ? `?${search}` : ""}`
  );
}

export function listAdminUsers() {
  return request<AdminUserResponse>("/admin/users");
}

export function listAgents() {
  return request<AdminAgentResponse>("/admin/agents");
}

export function updateAgentStatus(agentId: string, status: "ACTIVE" | "BANNED" | "PENDING") {
  return request<{ message?: string; data?: JsonValue }>(`/admin/agents/${agentId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
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

export function getFraudOverview() {
  return request<FraudOverviewResponse>("/admin/fraud/overview");
}

export function getFraudAlerts() {
  return request<FraudAlertsResponse>("/admin/fraud/alerts");
}

export function getFraudReports() {
  return request<FraudReportsResponse>("/admin/fraud/reports");
}

export function checkFraudTransaction(payload: {
  orderId: string;
  paymentAttemptId?: string;
  source?: string;
  couponCode?: string;
  deviceFingerprint?: string;
}) {
  return request<FraudReviewResponse>("/admin/fraud/check-transaction", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function reviewFraudCase(payload: { caseId: string; action: string; note?: string }) {
  return request<FraudReviewResponse>("/admin/fraud/review", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOrderDispute(orderId: string, payload: { disputeStatus?: string; adminNotes?: string; disputeReason?: string }) {
  return request<{ message?: string; order?: JsonValue }>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function refundOrderPayment(payload: { orderId: string; amount: number; reason?: string }) {
  return request<{ success?: boolean; refundedAmount?: number }>(`/payments/refund`, {
    method: "POST",
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

export function listAdminApps() {
  return request<AdminAppsResponse>("/admin/apps");
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

export function listCommissionRules() {
  return request<CommissionRuleResponse>("/admin/commissions/rules");
}

export function upsertCommissionRule(payload: {
  type: string;
  rate: number;
  category?: string;
  merchantTier?: string;
  campaignId?: string;
  isActive?: boolean;
  metadata?: JsonValue;
}) {
  return request<{ data?: JsonValue }>("/admin/commissions/rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export function listClaims() {
  return request<ClaimResponse>("/claims");
}

export function getClaimAnalytics() {
  return request<ClaimAnalyticsResponse>("/claims/analytics/overview");
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

export function listShipments(
  params: { limit?: number; dateFrom?: string; dateTo?: string; cursor?: string } | number = 100
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

export function getRiskSettings() {
  return request<{ data?: { highThreshold?: number; mediumThreshold?: number; tag?: string } & JsonValue }>(
    "/settings/risk"
  );
}

export function updateRiskSettings(payload: { highThreshold: number; mediumThreshold: number; tag?: string }) {
  return request<{ data?: { highThreshold?: number; mediumThreshold?: number; tag?: string } & JsonValue }>(
    "/admin/settings/risk",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export function getThresholdSettings() {
  return request<ThresholdSettingsResponse>("/settings/thresholds");
}

export function updateThresholdSettings(payload: {
  warningStart: number;
  warningEnd: number;
  criticalStart: number;
  criticalEnd: number;
}) {
  return request<ThresholdSettingsResponse>("/admin/settings/thresholds", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getAiRecommendations(params: { type?: string; location?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.location) search.set("location", params.location);
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  const query = search.toString();
  return request<AiRecommendationsResponse>(`/ai/recommendations${query ? `?${query}` : ""}`);
}

export function getAiTrending(params: { location?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.location) search.set("location", params.location);
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  const query = search.toString();
  return request<AiTrendingResponse>(`/ai/trending${query ? `?${query}` : ""}`);
}

export function getAiSimilarProducts(params: { product?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.product) search.set("product", params.product);
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  const query = search.toString();
  return request<AiSimilarProductsResponse>(`/ai/similar-products${query ? `?${query}` : ""}`);
}

export function getAiDemandForecast(params: { range?: string } = {}) {
  const search = new URLSearchParams();
  if (params.range) search.set("range", params.range);
  const query = search.toString();
  return request<AiDemandForecastResponse>(`/ai/demand-forecast${query ? `?${query}` : ""}`);
}

export function getAiPricingInsights(params: { location?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.location) search.set("location", params.location);
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  const query = search.toString();
  return request<AiPricingInsightsResponse>(`/ai/pricing-insights${query ? `?${query}` : ""}`);
}

export function getAiMerchantInsights(params: { location?: string; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.location) search.set("location", params.location);
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  const query = search.toString();
  return request<AiMerchantInsightsResponse>(`/ai/merchant-insights${query ? `?${query}` : ""}`);
}

export function getAiSearchIntelligence(params: { limit?: number } = {}) {
  const search = new URLSearchParams();
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  const query = search.toString();
  return request<AiSearchIntelligenceResponse>(`/ai/search-intelligence${query ? `?${query}` : ""}`);
}

export function getAiLocationInsights(params: { limit?: number } = {}) {
  const search = new URLSearchParams();
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  const query = search.toString();
  return request<AiLocationInsightsResponse>(`/ai/location-insights${query ? `?${query}` : ""}`);
}

export function getAiWarehouseOverview() {
  return request<AiWarehouseOverviewResponse>("/ai/warehouse/overview");
}

export function getAiWarehouseCohorts(params: { range?: string } = {}) {
  const search = new URLSearchParams();
  if (params.range) search.set("range", params.range);
  const query = search.toString();
  return request<AiWarehouseCohortsResponse>(`/ai/warehouse/cohorts${query ? `?${query}` : ""}`);
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

export function listNotifications() {
  return request<NotificationResponse>("/notifications");
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
  return request<NotificationSettingsResponse>("/notifications/settings");
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
  return request<NotificationSettingsResponse>("/notifications/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
