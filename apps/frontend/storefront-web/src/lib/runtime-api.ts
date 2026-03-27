"use client";

import { useAuthStore } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

type JsonValue = Record<string, unknown>;

type ProfileResponse = {
  message?: string;
  data?: JsonValue;
  user?: (JsonValue & {
    addresses?: Array<Record<string, unknown>>;
    savedPaymentMethods?: Array<Record<string, unknown>>;
  });
};

type MutationResponse = {
  message?: string;
  data?: JsonValue;
  token?: string;
  accessToken?: string;
  user?: JsonValue;
};

type AgentLeadRegistrationResponse = {
  message?: string;
  data?: {
    tempPassword?: string;
    user?: {
      _id?: string;
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
    };
    agent?: {
      _id?: string;
      agentCode?: string;
      referralLink?: string;
      status?: string;
    };
  };
};

type PreferencePayload = {
  addresses: Array<{
    label: string;
    recipient: string;
    phone: string;
    line1: string;
    city: string;
    isDefault?: boolean;
  }>;
  savedPaymentMethods: Array<{
    label: string;
    provider: string;
    accountRef: string;
    isDefault?: boolean;
  }>;
};

type RuntimeCartItem = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  shopId?: string;
};

type RuntimeCartResponse = {
  message?: string;
  data?: {
    _id?: string;
    items?: RuntimeCartItem[];
    totals?: {
      subtotal: number;
      quantity: number;
      itemCount: number;
      grandTotal?: number;
    };
  } | null;
  guestToken?: string | null;
};

type RuntimeProduct = {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
  shopId?: string;
};

type RuntimeProductListResponse = {
  message?: string;
  data?: RuntimeProduct[];
  count?: number;
};

type SearchSuggestionResponse = {
  data?: Array<Record<string, unknown>>;
  count?: number;
};

type MarketplaceSearchResponse = {
  products?: RuntimeProduct[];
  shops?: Array<{
    _id?: string;
    name?: string;
    slug?: string;
    domain?: string;
    ratingAverage?: number;
    distanceKm?: number | null;
    trustScore?: number | null;
  }>;
  categories?: string[];
};

type ShopSearchResponse = {
  data?: Array<{
    _id?: string;
    name?: string;
    slug?: string;
    domain?: string;
    ratingAverage?: number;
    distanceKm?: number | null;
    trustScore?: number | null;
  }>;
  count?: number;
};

type PaymentHandoffResponse = {
  message?: string;
  attemptId?: string;
  providerPaymentId?: string;
  gateway?: string;
  provider?: string;
  handoffType?: string;
  paymentUrl?: string;
  sessionId?: string | null;
  transactionId?: string | null;
  billing?: JsonValue | null;
  callbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type OrderDetailResponse = {
  message?: string;
  data?: JsonValue;
};

type ProductReviewResponse = {
  data?: Array<{
    _id?: string;
    reviewerName?: string;
    rating?: number;
    message?: string;
    createdAt?: string;
  }>;
  count?: number;
};

type HomeRecommendationResponse = {
  data?: {
    trending_products?: RuntimeProduct[];
    recommended_products?: RuntimeProduct[];
    flash_deals?: RuntimeProduct[];
    recently_viewed?: RuntimeProduct[];
    popular_shops?: Array<{
      _id?: string;
      name?: string;
      slug?: string;
      city?: string;
      country?: string;
      trustScore?: number;
      popularityScore?: number;
    }>;
  };
};

type EtaSettingsResponse = {
  data?: {
    basePerKm?: number;
    minEta?: number;
    fallbackEta?: number;
    trafficFactors?: Array<{ maxDistanceKm?: number; minutes?: number }>;
    distanceBrackets?: Array<{ maxDistanceKm?: number; minutes?: number }>;
  };
};

type TrafficContextResponse = {
  data?: {
    type?: "direct" | "marketplace";
    isMarketplaceEnabled?: boolean;
    scopeShopId?: string | null;
  };
};

type CustomerOverviewResponse = {
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
  };
};

type WalletMeResponse = {
  data?: {
    balance?: {
      cash?: number;
      credit?: number;
      bank?: number;
    };
    ledgerSummary?: {
      totalCredits?: number;
      totalDebits?: number;
      totalTransactions?: number;
    };
    lastTransactions?: Array<{
      _id?: string;
      amount?: number;
      walletType?: string;
      transactionType?: string;
      direction?: string;
      referenceId?: string;
      shopId?: string;
      orderId?: string;
      note?: string;
      createdAt?: string;
    }>;
  };
};

type CreditMeResponse = {
  data?: {
    customerId?: string;
    totalDue?: number;
    perShopDue?: Array<{ shopId?: string; amount?: number }>;
    sales?: Array<Record<string, unknown>>;
    paymentHistory?: Array<Record<string, unknown>>;
    creditAccounts?: Array<{
      shopId?: string;
      outstandingBalance?: number;
      creditLimit?: number;
      availableCredit?: number;
      status?: string;
    }>;
  };
};

type DeliveryGroupResponse = {
  data?: {
    _id?: string;
    deliveryCharge?: number;
    totalDistance?: number;
    zone?: string;
    route?: Array<Record<string, unknown>>;
  };
};

type ClaimResponse = {
  data?: Array<{
    _id?: string;
    orderId?: string;
    productId?: string;
    type?: string;
    status?: string;
    resolutionType?: string | null;
    reason?: string;
    decisionNote?: string;
    createdAt?: string;
    fraudFlags?: string[];
    protectionSnapshot?: {
      enabled?: boolean;
      durationDays?: number;
      type?: string;
      expiryDate?: string;
    };
  }>;
};

const guestCartStorageKey = "dokanx.guest-cart-token";

function getGuestToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(guestCartStorageKey);
}

function setGuestToken(token?: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(guestCartStorageKey, token);
    return;
  }
  window.localStorage.removeItem(guestCartStorageKey);
}

function getAuthHeaders() {
  const store = useAuthStore.getState();
  const guestToken = store.accessToken ? null : getGuestToken();

  return {
    "Content-Type": "application/json",
    ...(store.accessToken ? { Authorization: `Bearer ${store.accessToken}` } : {}),
    ...(store.tenant?.id ? { "x-tenant-id": store.tenant.id } : {}),
    ...(store.tenant?.slug ? { "x-tenant-slug": store.tenant.slug } : {}),
    ...(guestToken ? { "x-cart-token": guestToken } : {}),
  };
}

function getSearchHeaders() {
  if (typeof window === "undefined") return {};
  const searchId = window.sessionStorage.getItem("dokanx.search-id");
  const searchQuery = window.sessionStorage.getItem("dokanx.search-query");
  return {
    ...(searchId ? { "x-search-id": searchId } : {}),
    ...(searchQuery ? { "x-search-query": searchQuery } : {}),
  };
}

function buildIdempotencyKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...getSearchHeaders(),
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as (JsonValue & { message?: string; guestToken?: string | null }) | null;
  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  if (payload && "guestToken" in payload) {
    setGuestToken(typeof payload.guestToken === "string" ? payload.guestToken : null);
  }

  return payload as T;
}

export function registerCustomer(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  return request<MutationResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      role: "CUSTOMER",
    }),
  });
}

export function getProfile() {
  return request<ProfileResponse>("/me");
}

export function getTrafficContext() {
  return request<TrafficContextResponse>("/traffic/context");
}

export function getCustomerOverview(globalCustomerId: string) {
  return request<CustomerOverviewResponse>(`/customers/${encodeURIComponent(globalCustomerId)}`);
}

export function getMyWallet() {
  return request<WalletMeResponse>("/wallet/me");
}

export function getDeliveryGroup(groupId: string) {
  return request<DeliveryGroupResponse>(`/delivery/groups/${encodeURIComponent(groupId)}`);
}

export function getCustomerDue(customerId: string) {
  return request<{
    data?: {
      customerId?: string;
      totalDue?: number;
      shopWiseDue?: Array<{ shopId?: string; amount?: number }>;
      sales?: Array<Record<string, unknown>>;
    };
  }>(`/credit/customers/${encodeURIComponent(customerId)}`);
}

export function getMyCredit() {
  return request<CreditMeResponse>("/credit/me");
}

export function payCustomerDue(payload: {
  creditSaleId?: string;
  customerId?: string;
  amount: number;
  referenceId: string;
  paymentMode?: "WALLET" | "ONLINE";
  provider?: string;
  metadata?: JsonValue;
}) {
  return request<MutationResponse>("/credit/payments", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Idempotency-Key": payload.referenceId || buildIdempotencyKey("credit-payment"),
    },
  });
}

export function registerAgentFromLead(payload: {
  name: string;
  phone: string;
  district: string;
  experience?: string;
  source?: string;
}) {
  return request<AgentLeadRegistrationResponse>("/agents/register-from-lead", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function trackAgentReferralClick(agentCode: string) {
  return request<{ data?: { agentCode?: string; status?: string; referralLink?: string } }>(
    `/agents/track-click?ref=${encodeURIComponent(agentCode)}`
  );
}

export function createClaim(payload: {
  orderId: string;
  productId: string;
  customerId: string;
  type: "warranty" | "guarantee";
  reason: string;
  evidence?: Array<{ imageUrl?: string; note?: string }>;
}) {
  return request<{ data?: JsonValue }>("/claims", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCustomerClaims(customerId: string) {
  return request<ClaimResponse>(`/claims/customer/${encodeURIComponent(customerId)}`);
}

export function updatePreferences(payload: PreferencePayload) {
  return request<ProfileResponse>("/me/preferences", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getRuntimeCart(shopId?: string) {
  const query = shopId ? `?shopId=${encodeURIComponent(shopId)}` : "";
  return request<RuntimeCartResponse>(`/cart${query}`);
}

export function getHomeProfileBundle(globalCustomerId?: string) {
  return Promise.all([
    getProfile().catch(() => null),
    globalCustomerId ? getCustomerOverview(globalCustomerId).catch(() => null) : Promise.resolve(null),
  ]);
}

export function searchRuntimeProducts(query: Record<string, string | undefined>) {
  const search = new URLSearchParams(
    Object.entries(query).filter(([, value]) => typeof value === "string" && value.length > 0) as Array<[string, string]>
  ).toString();
  return request<RuntimeProductListResponse>(`/search/products${search ? `?${search}` : ""}`);
}

export function searchMarketplace(query: Record<string, string | undefined>) {
  const search = new URLSearchParams(
    Object.entries(query).filter(([, value]) => typeof value === "string" && value.length > 0) as Array<[string, string]>
  ).toString();
  return request<MarketplaceSearchResponse>(`/search${search ? `?${search}` : ""}`);
}

export function searchSuggestions(query: string) {
  const search = new URLSearchParams({ q: query }).toString();
  return request<SearchSuggestionResponse>(`/search/suggestions?${search}`);
}

export function getHomeRecommendations(params?: { location?: string; limit?: string }) {
  const search = params ? new URLSearchParams(params).toString() : "";
  return request<HomeRecommendationResponse>(`/recommendations/home${search ? `?${search}` : ""}`);
}

export function trackProductView(payload: { productId: string; shopId?: string }) {
  return request<MutationResponse>("/analytics/events", {
    method: "POST",
    body: JSON.stringify({
      type: "PRODUCT_VIEW",
      productId: payload.productId,
      shopId: payload.shopId,
    }),
  });
}

export function trackRecommendationImpression(payload: { productIds: string[]; context: string }) {
  return request<MutationResponse>("/analytics/events", {
    method: "POST",
    body: JSON.stringify({
      type: "REC_IMPRESSION",
      productIds: payload.productIds,
      context: payload.context,
    }),
  });
}

export function trackRecommendationClick(payload: { productId: string; context: string }) {
  return request<MutationResponse>("/analytics/events", {
    method: "POST",
    body: JSON.stringify({
      type: "REC_CLICK",
      productId: payload.productId,
      context: payload.context,
    }),
  });
}

export function searchShops(
  query: string,
  filters?: { district?: string; market?: string; lat?: string; lng?: string; distance?: string }
) {
  const params = new URLSearchParams({ q: query });
  if (filters?.district) params.set("district", filters.district);
  if (filters?.market) params.set("market", filters.market);
  if (filters?.lat) params.set("lat", filters.lat);
  if (filters?.lng) params.set("lng", filters.lng);
  if (filters?.distance) params.set("distance", filters.distance);
  return request<ShopSearchResponse>(`/search/shops?${params.toString()}`);
}

export function listLocations() {
  return request<{ data?: Array<{ _id?: string; name?: string; city?: string; shopId?: string; coordinates?: { coordinates?: number[] } }> }>("/locations");
}

export function saveCart(payload: {
  shopId: string;
  items: Array<{ productId: string; quantity: number }>;
}) {
  return request<RuntimeCartResponse>("/cart", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function addToCart(payload: { shopId: string; productId: string; quantity?: number }) {
  const quantity = Math.max(1, Number(payload.quantity) || 1);
  if (!payload.shopId || !payload.productId) {
    throw new Error("shopId and productId are required");
  }

  let existingItems: Array<{ productId: string; quantity: number }> = [];
  try {
    const response = await getRuntimeCart(payload.shopId);
    existingItems =
      response.data?.items?.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })) || [];
  } catch {
    existingItems = [];
  }

  const merged = new Map<string, number>();
  for (const item of existingItems) {
    merged.set(item.productId, (merged.get(item.productId) || 0) + item.quantity);
  }
  merged.set(payload.productId, (merged.get(payload.productId) || 0) + quantity);

  return saveCart({
    shopId: payload.shopId,
    items: Array.from(merged.entries()).map(([productId, qty]) => ({
      productId,
      quantity: qty,
    })),
  });
}

export function clearCart(shopId: string) {
  return request<MutationResponse>(`/cart?shopId=${encodeURIComponent(shopId)}`, {
    method: "DELETE",
  });
}

export function createOrder(payload: {
  shopId?: string;
  items: Array<{ product: string; quantity: number }>;
  addressId?: string;
  deliveryMode: string;
  paymentMode: string;
  notes?: string;
  deliveryAddress?: {
    line1?: string;
    city?: string;
    area?: string;
    postalCode?: string;
    country?: string;
  };
  totalAmount: number;
  shippingFee?: number;
  couponCode?: string;
  multiShopGroup?: never;
}) {
  return request<MutationResponse>("/orders", {
    method: "POST",
    headers: {
      "Idempotency-Key": buildIdempotencyKey("order"),
    },
    body: JSON.stringify(payload),
  });
}

export function initiatePayment(orderId: string, payload: { provider: string }) {
  return request<PaymentHandoffResponse>(`/payments/initiate/${orderId}`, {
    method: "POST",
    headers: {
      "Idempotency-Key": buildIdempotencyKey("payment"),
    },
    body: JSON.stringify({
      ...payload,
      frontendOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
    }),
  });
}

export function getMyOrders() {
  return request<OrderDetailResponse>("/orders/my");
}

export function getOrderDetail(orderId: string) {
  return request<OrderDetailResponse>(`/orders/${orderId}`);
}

export function getProductReviews(productId: string, params?: { page?: string; limit?: string }) {
  const search = params ? new URLSearchParams(params).toString() : "";
  return request<ProductReviewResponse>(
    `/products/${productId}/reviews${search ? `?${search}` : ""}`
  );
}

export function submitProductReview(productId: string, payload: { reviewerName?: string; rating: number; message: string }) {
  return request<{ message?: string; data?: JsonValue }>(`/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getEtaSettings() {
  return request<EtaSettingsResponse>("/settings/eta");
}
