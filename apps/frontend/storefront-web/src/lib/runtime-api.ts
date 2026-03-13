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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
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

export function searchRuntimeProducts(query: Record<string, string>) {
  const search = new URLSearchParams(query).toString();
  return request<RuntimeProductListResponse>(`/search/products${search ? `?${search}` : ""}`);
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

export function clearCart(shopId: string) {
  return request<MutationResponse>(`/cart?shopId=${encodeURIComponent(shopId)}`, {
    method: "DELETE",
  });
}

export function createOrder(payload: {
  shopId?: string;
  items: Array<{ product: string; quantity: number }>;
  totalAmount: number;
  shippingFee?: number;
  couponCode?: string;
}) {
  return request<MutationResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function initiatePayment(orderId: string, payload: { paymentMethod: string; hasOwnGateway?: boolean }) {
  return request<PaymentHandoffResponse>(`/payments/initiate/${orderId}`, {
    method: "POST",
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
