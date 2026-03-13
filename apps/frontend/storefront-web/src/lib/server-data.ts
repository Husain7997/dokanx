import type { Cart, MarketplaceApp, Order, Product, TenantConfig } from "@dokanx/types";

import { createServerApi } from "./server-api";

const fallbackProducts: Product[] = [
  {
    id: "demo-headphones",
    name: "Studio Wireless Headphones",
    category: "Audio",
    description: "Balanced sound, low latency, and all-day battery life.",
    price: 5400,
    stock: 12,
    image: "https://placehold.co/1200x900",
  },
  {
    id: "demo-keyboard",
    name: "Mechanical Keyboard",
    category: "Accessories",
    description: "Hot-swappable compact board with tactile feedback.",
    price: 3200,
    stock: 18,
    image: "https://placehold.co/1200x900",
  },
  {
    id: "demo-speaker",
    name: "Portable Speaker",
    category: "Audio",
    description: "Room-filling sound with IPX water resistance.",
    price: 2800,
    stock: 7,
    image: "https://placehold.co/1200x900",
  },
];

const fallbackApps: MarketplaceApp[] = [
  { id: "crm", name: "CRM Sync", category: "Growth", installed: true },
  { id: "chat", name: "Live Chat", category: "Support", installed: true },
  { id: "loyalty", name: "Loyalty Engine", category: "Retention", installed: false },
];

const fallbackCart: Cart = {
  id: "demo-cart",
  items: [
    { id: "line-1", productId: "demo-headphones", name: "Studio Wireless Headphones", quantity: 1, price: 5400 },
    { id: "line-2", productId: "demo-keyboard", name: "Mechanical Keyboard", quantity: 1, price: 3200 },
  ],
  totals: {
    subtotal: 8600,
    quantity: 2,
    itemCount: 2,
  },
};

const fallbackOrders: Order[] = [
  { id: "DX-10021", status: "PROCESSING", totalAmount: 8600, createdAt: "Today, 10:20 AM" },
  { id: "DX-10012", status: "DELIVERED", totalAmount: 3200, createdAt: "Yesterday, 4:05 PM" },
];

async function safeCall<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch {
    return fallback;
  }
}

function buildCartFromProducts(products: Array<Product & { _id?: string; shopId?: string }>): Cart {
  if (!products.length) {
    return fallbackCart;
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
    safeCall(() => api.product.list(), { data: fallbackProducts, count: fallbackProducts.length }),
    safeCall(() => api.marketplace.list(), { data: fallbackApps }),
  ]);

  return {
    products: productsResponse.data || fallbackProducts,
    productCount: productsResponse.count || productsResponse.data?.length || fallbackProducts.length,
    apps: appsResponse.data || fallbackApps,
  };
}

export async function getProductsData(tenant: TenantConfig | null, query?: Record<string, string>) {
  const response = await safeCall(
    () => createServerApi(tenant).product.search(query || {}),
    { data: fallbackProducts, count: fallbackProducts.length },
  );

  const data = response.data || fallbackProducts;
  return data.length ? data : fallbackProducts;
}

export async function getCartData(tenant: TenantConfig | null) {
  const api = createServerApi(tenant);
  const productsResponse = await safeCall(
    () => api.product.search({ limit: "6", minStock: "1" }),
    { data: fallbackProducts, count: fallbackProducts.length }
  );

  const products = (productsResponse.data || fallbackProducts) as Array<Product & { _id?: string; shopId?: string }>;
  const seededShopId = products[0]?.shopId ? String(products[0].shopId) : "";
  const cartResponse = await safeCall(
    () => api.cart.get(seededShopId ? { shopId: seededShopId } : undefined),
    { data: fallbackCart }
  );

  const cart = cartResponse.data || null;
  if (cart?.items?.length) {
    return cart;
  }

  return buildCartFromProducts(products);
}

export async function getOrdersData(tenant: TenantConfig | null) {
  const response = await safeCall(() => createServerApi(tenant).order.list(), { data: fallbackOrders });
  return response.data || fallbackOrders;
}

export async function getProductBySlug(tenant: TenantConfig | null, slug: string) {
  const response = await safeCall(
    () => createServerApi(tenant).product.list({ slug }),
    { data: fallbackProducts.filter((item) => item.id === slug || item.slug === slug) },
  );

  return response.data?.[0] || fallbackProducts[0];
}

export async function getShopsDirectory() {
  return [
    {
      slug: "aurora",
      name: "Aurora Electronics",
      description: "Fast-moving gadgets, audio gear, and creator tools.",
      rating: "4.9",
      verified: true,
      district: "Dhaka",
      thana: "Gulshan",
      market: "Gulshan-1",
      category: "Electronics",
      address: "House 18, Road 9, Gulshan-1, Dhaka",
      lat: 23.7808,
      lng: 90.4153,
    },
    {
      slug: "nook",
      name: "Nook Home",
      description: "Kitchen, decor, and daily essentials for compact living.",
      rating: "4.7",
      verified: true,
      district: "Dhaka",
      thana: "Dhanmondi",
      market: "Dhanmondi 27",
      category: "Home & Living",
      address: "Road 27, Dhanmondi, Dhaka",
      lat: 23.7461,
      lng: 90.3742,
    },
    {
      slug: "atelier",
      name: "Atelier Wear",
      description: "Small-batch fashion, accessories, and premium basics.",
      rating: "4.8",
      verified: false,
      district: "Chattogram",
      thana: "Pahartali",
      market: "GEC Circle",
      category: "Fashion",
      address: "GEC Circle, Chattogram",
      lat: 22.359,
      lng: 91.8217,
    },
    {
      slug: "bazarika",
      name: "Bazarika Grocers",
      description: "Daily essentials, snacks, and pantry staples with fast pickup.",
      rating: "4.6",
      verified: true,
      district: "Sylhet",
      thana: "Zindabazar",
      market: "Zindabazar",
      category: "Grocery",
      address: "Zindabazar, Sylhet",
      lat: 24.8949,
      lng: 91.8687,
    },
    {
      slug: "sunrise-books",
      name: "Sunrise Books",
      description: "Books, stationery, and curated education supplies.",
      rating: "4.5",
      verified: true,
      district: "Rajshahi",
      thana: "Boalia",
      market: "Shaheb Bazar",
      category: "Books",
      address: "Shaheb Bazar, Rajshahi",
      lat: 24.3636,
      lng: 88.6241,
    },
  ];
}
