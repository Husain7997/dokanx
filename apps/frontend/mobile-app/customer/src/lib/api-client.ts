import { apiRequest, registerUnauthorizedHandler } from "../../../shared/api-client";
import { getApiBaseUrl } from "../../../shared/api-config";

const CUSTOMER_APP_VERSION = "1.0.0";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown> | null;
  token?: string | null;
  tenantId?: string | null;
  cartToken?: string | null;
  headers?: Record<string, string>;
};

export async function request<T>(path: string, options: RequestOptions = {}) {
  return apiRequest<T>(getApiBaseUrl(CUSTOMER_APP_VERSION), path, options);
}

export { registerUnauthorizedHandler };

function buildIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function registerRequest(payload: { name: string; email: string; password: string; phone?: string }) {
  return request<{ token: string }>("/api/auth/register", {
    method: "POST",
    body: {
      ...payload,
      role: "CUSTOMER",
    },
  });
}

export function loginRequest(payload: { email: string; password: string }) {
  return request<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function getProfileRequest(token: string) {
  return request<{
    user?: {
      _id?: string;
      name?: string;
      email?: string;
      phone?: string;
      globalCustomerId?: string;
      addresses?: Array<Record<string, unknown>>;
      savedPaymentMethods?: Array<Record<string, unknown>>;
    };
  }>("/api/me", {
    token,
  });
}

export function getMyWalletRequest(token: string) {
  return request<{
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
      lastTransactions?: Array<Record<string, unknown>>;
    };
  }>("/api/wallet/me", {
    token,
  });
}

export function getMyCreditRequest(token: string) {
  return request<{
    data?: {
      customerId?: string;
      totalDue?: number;
      perShopDue?: Array<{ shopId?: string; amount?: number }>;
      sales?: Array<Record<string, unknown>>;
      paymentHistory?: Array<Record<string, unknown>>;
      creditAccounts?: Array<Record<string, unknown>>;
    };
  }>("/api/credit/me", {
    token,
  });
}

export function listPublicShops(params?: {
  category?: string;
  distance?: number;
  rating?: number;
  lat?: number;
  lng?: number;
}) {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.distance != null) search.set("distance", String(params.distance));
  if (params?.rating != null) search.set("rating", String(params.rating));
  if (params?.lat != null) search.set("lat", String(params.lat));
  if (params?.lng != null) search.set("lng", String(params.lng));
  return request<{
    data?: Array<{
      _id?: string;
      id?: string;
      shopId?: string;
      name?: string;
      domain?: string;
      slug?: string;
      lat?: number;
      lng?: number;
      category?: string;
      ratingAverage?: number;
      distanceKm?: number | null;
      trustScore?: number;
      popularityScore?: number;
      isTrending?: boolean;
      locationName?: string | null;
    }>;
  }>(`/api/shops/public${search.toString() ? `?${search.toString()}` : ""}`);
}

export function listLocations() {
  return request<{ data?: Array<{ _id?: string; name?: string; city?: string; country?: string; address?: string; shopId?: string; coordinates?: { coordinates?: number[] } }> }>(
    "/api/locations"
  );
}

export function searchSuggestions(query: string) {
  const search = new URLSearchParams({ q: query }).toString();
  return request<{ data?: Array<Record<string, unknown>> }>(`/api/search/suggestions?${search}`);
}

export function searchNearbyLocations(params: { lat: number; lng: number; distance?: number }) {
  const search = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    distance: String(params.distance ?? 5000),
  });
  return request<{ data?: Array<{ _id?: string; name?: string; city?: string; shopId?: string; coordinates?: { coordinates?: number[] } }> }>(
    `/api/locations/nearby?${search.toString()}`
  );
}

export function searchProducts(params: { shopId?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.shopId) search.set("shopId", params.shopId);
  if (params.q) search.set("q", params.q);
  return request<{ data?: Array<{ _id?: string; id?: string; name?: string; price?: number; shopId?: string }> }>(
    `/api/search/products${search.toString() ? `?${search.toString()}` : ""}`
  );
}

export function placeOrderRequest(
  token: string,
  payload: {
    items: Array<{ product: string; quantity: number }>;
    addressId?: string;
    deliveryMode: string;
    paymentMode: "COD" | "ONLINE" | "WALLET" | "CREDIT";
    notes?: string;
    deliveryAddress?: {
      line1?: string;
      city?: string;
      area?: string;
      postalCode?: string;
      country?: string;
    };
    shopId?: string;
    totalAmount: number;
  },
  tenantId?: string | null,
) {
  return request<{ data?: unknown; message?: string }>("/api/orders", {
    method: "POST",
    body: payload,
    token,
    tenantId: tenantId || undefined,
    headers: {
      "Idempotency-Key": buildIdempotencyKey("mobile-order"),
    },
  });
}

export function payCreditDueRequest(
  token: string,
  payload: {
    creditSaleId?: string;
    customerId?: string;
    amount: number;
    referenceId: string;
    paymentMode?: "WALLET" | "ONLINE";
    provider?: string;
    metadata?: Record<string, unknown>;
  }
) {
  return request<{ data?: Record<string, unknown>; message?: string }>("/api/credit/payments", {
    method: "POST",
    token,
    body: payload,
    headers: {
      "Idempotency-Key": payload.referenceId || buildIdempotencyKey("mobile-credit-payment"),
    },
  });
}

export function getMyOrdersRequest(token: string) {
  return request<{ data?: Array<Record<string, unknown>> }>("/api/orders/my", {
    token,
  });
}

export function getOrderDetailRequest(token: string, orderId: string) {
  return request<{ data?: Record<string, unknown> }>(`/api/orders/${encodeURIComponent(orderId)}`, {
    token,
  });
}

export function initiatePaymentRequest(
  token: string,
  orderId: string,
  payload: { provider: string }
) {
  return request<{ paymentUrl?: string; provider?: string; gateway?: string; message?: string }>(
    `/api/payments/initiate/${encodeURIComponent(orderId)}`,
    {
      method: "POST",
      token,
      body: payload,
      headers: {
        "Idempotency-Key": buildIdempotencyKey("mobile-payment"),
      },
    }
  );
}

export function getCustomerOverviewRequest(token: string, globalCustomerId: string) {
  return request<{ data?: Record<string, unknown> }>(`/api/customers/${encodeURIComponent(globalCustomerId)}`, {
    token,
  });
}

export function getCustomerClaimsRequest(token: string, globalCustomerId: string) {
  return request<{ data?: Array<Record<string, unknown>> }>(
    `/api/claims/customer/${encodeURIComponent(globalCustomerId)}`,
    { token }
  );
}

export function createClaimRequest(
  token: string,
  payload: {
    orderId: string;
    productId: string;
    customerId: string;
    type: "warranty" | "guarantee";
    reason: string;
  }
) {
  return request<{ data?: Record<string, unknown>; message?: string }>("/api/claims", {
    method: "POST",
    token,
    body: payload,
  });
}

export function getRecommendationsRequest(params?: { location?: string; limit?: string }) {
  const search = params ? new URLSearchParams(params).toString() : "";
  return request<{ data?: Record<string, unknown> }>(`/api/recommendations/home${search ? `?${search}` : ""}`);
}

export function getTrendingRequest(params?: { limit?: string }) {
  const search = params ? new URLSearchParams(params).toString() : "";
  return request<{ data?: Array<Record<string, unknown>> }>(`/api/ai/trending${search ? `?${search}` : ""}`);
}

export function getCartRequest(params: {
  shopId: string;
  token?: string | null;
  cartToken?: string | null;
}) {
  const search = new URLSearchParams({ shopId: params.shopId });
  return request<{
    data?: {
      items?: Array<{
        productId?: string;
        name?: string;
        price?: number;
        quantity?: number;
      }>;
      totals?: Record<string, number>;
    } | null;
    guestToken?: string;
  }>(`/api/cart?${search.toString()}`, {
    token: params.token || undefined,
    cartToken: params.cartToken || undefined,
  });
}

export function saveCartRequest(params: {
  shopId: string;
  items: Array<{ productId: string; quantity: number; name?: string; price?: number }>;
  token?: string | null;
  cartToken?: string | null;
}) {
  return request<{
    data?: {
      items?: Array<{
        productId?: string;
        name?: string;
        price?: number;
        quantity?: number;
      }>;
      totals?: Record<string, number>;
    } | null;
    guestToken?: string;
  }>("/api/cart", {
    method: "PUT",
    body: {
      shopId: params.shopId,
      items: params.items,
    },
    token: params.token || undefined,
    cartToken: params.cartToken || undefined,
  });
}

export function clearCartRequest(params: {
  shopId: string;
  token?: string | null;
  cartToken?: string | null;
}) {
  const search = new URLSearchParams({ shopId: params.shopId });
  return request<{ message?: string; guestToken?: string }>(`/api/cart?${search.toString()}`, {
    method: "DELETE",
    token: params.token || undefined,
    cartToken: params.cartToken || undefined,
  });
}
