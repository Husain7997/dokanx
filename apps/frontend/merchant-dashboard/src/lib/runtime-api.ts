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

type MutationResponse = {
  message?: string;
  data?: JsonValue;
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
}) {
  return request<ShopSettingsResponse>("/shops/me/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
