import { Platform } from "react-native";

const fallbackBaseUrl = Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://localhost:5001";
const apiBaseUrl = process.env.API_BASE_URL || fallbackBaseUrl;

export function getApiBaseUrl() {
  return apiBaseUrl.replace(/\/$/, "");
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown> | null;
  token?: string | null;
  tenantId?: string | null;
  cartToken?: string | null;
};

export async function request<T>(path: string, options: RequestOptions = {}) {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.tenantId ? { "x-tenant-id": options.tenantId } : {}),
      ...(options.cartToken ? { "x-cart-token": options.cartToken } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;
  if (!response.ok) {
    const message = (payload as { message?: string } | null)?.message || "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export function loginRequest(payload: { email: string; password: string }) {
  return request<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function listPublicShops() {
  return request<{ data?: Array<{ _id?: string; id?: string; name?: string; domain?: string; slug?: string }> }>(
    "/api/shops/public"
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
    totalAmount: number;
  },
  tenantId?: string | null,
) {
  return request<{ data?: unknown; message?: string }>("/api/orders", {
    method: "POST",
    body: payload,
    token,
    tenantId: tenantId || undefined,
  });
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
