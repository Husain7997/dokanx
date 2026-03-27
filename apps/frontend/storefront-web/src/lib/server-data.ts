import type { Cart, MarketplaceApp, Order, Product, TenantConfig } from "@dokanx/types";

import { createServerApi } from "./server-api";
import { getApiBaseUrl } from "@dokanx/utils";

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

export async function getHomeRecommendations(tenant: TenantConfig | null, query?: Record<string, string>) {
  const response = await safeCall(
    () => createServerApi(tenant).recommendation.home(query || {}),
    { data: {} as Record<string, unknown> }
  );

  return response.data || {};
}

export async function getProductRecommendations(
  tenant: TenantConfig | null,
  productId: string,
  query?: Record<string, string>
) {
  const response = await safeCall(
    () => createServerApi(tenant).recommendation.product(productId, query || {}),
    { data: {} as Record<string, unknown> }
  );

  return response.data || {};
}

export async function getShopRecommendations(
  tenant: TenantConfig | null,
  shopId: string,
  query?: Record<string, string>
) {
  const response = await safeCall(
    () => createServerApi(tenant).recommendation.shop(shopId, query || {}),
    { data: {} as Record<string, unknown> }
  );

  return response.data || {};
}

export async function getCartData(tenant: TenantConfig | null) {
  const api = createServerApi(tenant);
  const shopSeed = await safeCall(() => api.product.search({ limit: "1", minStock: "1" }), { data: [], count: 0 });
  const firstProduct = (shopSeed.data || [])[0] as (Product & { shopId?: string }) | undefined;
  const seededShopId = firstProduct?.shopId ? String(firstProduct.shopId) : "";
  const cartResponse = await safeCall(
    () => api.cart.get(seededShopId ? { shopId: seededShopId } : undefined),
    { data: emptyCart }
  );

  const cart = cartResponse.data || null;
  return cart?.items?.length ? cart : emptyCart;
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

type ShopDirectoryItem = {
  slug: string;
  name: string;
  description: string;
  rating: string;
  verified: boolean;
  district: string;
  thana: string;
  market: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  shopId: string;
};

export async function getShopsDirectory() {
  try {
    const baseUrl = getApiBaseUrl();
    const [shopsResponse, locationsResponse] = await Promise.all([
      fetch(`${baseUrl}/shops/public`, { cache: "no-store" }).then((res) => res.json()),
      fetch(`${baseUrl}/locations`, { cache: "no-store" }).then((res) => res.json()),
    ]);

    const shopMap = new Map(
      (shopsResponse.data || []).map((shop: { _id?: string; id?: string; name?: string; slug?: string; domain?: string }) => [
        String(shop._id || shop.id || ""),
        shop,
      ])
    );

    const locations = locationsResponse.data || [];

    return locations
      .map((location: any) => {
        const shop = (shopMap.get(String(location.shopId)) || {}) as {
          _id?: string;
          id?: string;
          slug?: string;
          domain?: string;
          name?: string;
        };
        const coords = location.coordinates?.coordinates || [];
        const routeKey = String(shop.slug || shop.domain || shop._id || shop.id || location.shopId || "").trim();

        if (!routeKey) {
          return null;
        }

        return {
          slug: routeKey,
          name: shop.name || location.name || "Shop",
          description: "Multi-tenant storefront",
          rating: "4.7",
          verified: true,
          district: location.city || "Dhaka",
          thana: location.city || "Dhaka",
          market: "Main Market",
          category: "General",
          address: location.address || "Address pending",
          lat: Number(coords[1] || 0),
          lng: Number(coords[0] || 0),
          shopId: String(shop._id || shop.id || location.shopId || ""),
        };
      })
      .filter((item: ShopDirectoryItem | null): item is ShopDirectoryItem => Boolean(item && Number.isFinite(item.lat) && Number.isFinite(item.lng) && item.lat !== 0 && item.lng !== 0));
  } catch {
    return [];
  }
}

export async function getShopBySlug(slug: string) {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/shops/public`, { cache: "no-store" }).then((res) => res.json());
    const shops = response.data || [];
    return shops.find((shop: { _id?: string; id?: string; slug?: string; domain?: string }) => (
      shop.slug === slug ||
      shop.domain === slug ||
      String(shop._id || "") === slug ||
      String(shop.id || "") === slug
    )) || null;
  } catch {
    return null;
  }
}
