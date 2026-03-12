"use client";

import { useAuthStore } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

type JsonValue = Record<string, unknown>;

type ProfileResponse = {
  message?: string;
  data?: JsonValue;
  user?: JsonValue;
};

type MutationResponse = {
  message?: string;
  data?: JsonValue;
};

function getAuthHeaders() {
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
      ...getAuthHeaders(),
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as (JsonValue & { message?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
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

export function saveCart(payload: {
  shopId: string;
  items: Array<{ productId: string; quantity: number }>;
}) {
  return request<MutationResponse>("/cart", {
    method: "PUT",
    body: JSON.stringify(payload),
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
