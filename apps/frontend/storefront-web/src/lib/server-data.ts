import type { Cart, MarketplaceApp, Order, Product, TenantConfig } from "@dokanx/types";

import { createServerApi } from "./server-api";

const emptyCart: Cart = {
  id: "empty-cart",
  items: [],
  totals: {
    subtotal: 0,
    quantity: 0,
    itemCount: 0,
  },
};

async function safeCall<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch {
    return fallback;
  }
}

function buildCartFromProducts(products: Array<Product & { _id?: string; shopId?: string }>): Cart {
  if (!products.length) {
    return emptyCart;
  }

  const seededShopId = products[0]?.shopId;
  const sameShopProducts = products.filter((item) => item.shopId === seededShopId).slice(0, 2);
  const rows = (sameShopProducts.length ? sameShopProducts : products.slice(0, 2)).map((item, index) => ({
    id: `line-${index + 1}`,
    productId: String(item._id || item.id),
    name: item.name,
    quantity: 1,
    price: item.price,
    shopId: item.shopId,
  }));

  const subtotal = rows.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    id: "seeded-cart",
    items: rows,
    totals: {
      subtotal,
      quantity: rows.reduce((sum, item) => sum + item.quantity, 0),
      itemCount: rows.length,
    },
  };
}

export async function getHomePageData(tenant: TenantConfig | null) {
  const api = createServerApi(tenant);
  const [productsResponse, appsResponse] = await Promise.all([
    safeCall(() => api.product.list(), { data: [], count: 0 }),
    safeCall(() => api.marketplace.list(), { data: [] as MarketplaceApp[] }),
  ]);

  return {
    products: productsResponse.data || [],
    productCount: productsResponse.count || productsResponse.data?.length || 0,
    apps: appsResponse.data || [],
  };
}

export async function getProductsData(tenant: TenantConfig | null, query?: Record<string, string>) {
  const response = await safeCall(
    () => createServerApi(tenant).product.search(query || {}),
    { data: [], count: 0 },
  );

  return response.data || [];
}

export async function getCartData(tenant: TenantConfig | null) {
  const api = createServerApi(tenant);
  const productsResponse = await safeCall(
    () => api.product.search({ limit: "6", minStock: "1" }),
    { data: [], count: 0 }
  );

  const products = (productsResponse.data || []) as Array<Product & { _id?: string; shopId?: string }>;
  const seededShopId = products[0]?.shopId ? String(products[0].shopId) : "";
  const cartResponse = await safeCall(
    () => api.cart.get(seededShopId ? { shopId: seededShopId } : undefined),
    { data: emptyCart }
  );

  const cart = cartResponse.data || null;
  if (cart?.items?.length) {
    return cart;
  }

  return buildCartFromProducts(products);
}

export async function getOrdersData(tenant: TenantConfig | null) {
  const response = await safeCall(() => createServerApi(tenant).order.list(), { data: [] as Order[] });
  return response.data || [];
}

export async function getProductBySlug(tenant: TenantConfig | null, slug: string) {
  const response = await safeCall(
    () => createServerApi(tenant).product.list({ slug }),
    { data: [] as Product[] },
  );

  return response.data?.[0] || null;
}

export async function getShopsDirectory() {
  return [];
}
