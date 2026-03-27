import { createServerApi } from "./server-api";
import { getApiBaseUrl } from "@dokanx/utils";
const emptyCart = {
    id: "empty-cart",
    items: [],
    totals: {
        subtotal: 0,
        quantity: 0,
        itemCount: 0,
    },
};
async function safeCall(request, fallback) {
    try {
        return await request();
    }
    catch {
        return fallback;
    }
}
function buildCartFromProducts(products) {
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
export async function getHomePageData(tenant) {
    const api = createServerApi(tenant);
    const [productsResponse, appsResponse] = await Promise.all([
        safeCall(() => api.product.list(), { data: [], count: 0 }),
        safeCall(() => api.marketplace.list(), { data: [] }),
    ]);
    return {
        products: productsResponse.data || [],
        productCount: productsResponse.count || productsResponse.data?.length || 0,
        apps: appsResponse.data || [],
    };
}
export async function getProductsData(tenant, query) {
    const response = await safeCall(() => createServerApi(tenant).product.search(query || {}), { data: [], count: 0 });
    return response.data || [];
}
export async function getHomeRecommendations(tenant, query) {
    const response = await safeCall(() => createServerApi(tenant).recommendation.home(query || {}), { data: {} });
    return response.data || {};
}
export async function getProductRecommendations(tenant, productId, query) {
    const response = await safeCall(() => createServerApi(tenant).recommendation.product(productId, query || {}), { data: {} });
    return response.data || {};
}
export async function getShopRecommendations(tenant, shopId, query) {
    const response = await safeCall(() => createServerApi(tenant).recommendation.shop(shopId, query || {}), { data: {} });
    return response.data || {};
}
export async function getCartData(tenant) {
    const api = createServerApi(tenant);
    const productsResponse = await safeCall(() => api.product.search({ limit: "6", minStock: "1" }), { data: [], count: 0 });
    const products = (productsResponse.data || []);
    const seededShopId = products[0]?.shopId ? String(products[0].shopId) : "";
    const cartResponse = await safeCall(() => api.cart.get(seededShopId ? { shopId: seededShopId } : undefined), { data: emptyCart });
    const cart = cartResponse.data || null;
    if (cart?.items?.length) {
        return cart;
    }
    return buildCartFromProducts(products);
}
export async function getOrdersData(tenant) {
    const response = await safeCall(() => createServerApi(tenant).order.list(), { data: [] });
    return response.data || [];
}
export async function getProductBySlug(tenant, slug) {
    const response = await safeCall(() => createServerApi(tenant).product.list({ slug }), { data: [] });
    return response.data?.[0] || null;
}
export async function getShopsDirectory() {
    try {
        const baseUrl = getApiBaseUrl();
        const [shopsResponse, locationsResponse] = await Promise.all([
            fetch(`${baseUrl}/shops/public`, { cache: "no-store" }).then((res) => res.json()),
            fetch(`${baseUrl}/locations`, { cache: "no-store" }).then((res) => res.json()),
        ]);
        const shopMap = new Map((shopsResponse.data || []).map((shop) => [
            String(shop._id || shop.id || ""),
            shop,
        ]));
        const locations = locationsResponse.data || [];
        return locations.map((location, index) => {
            const shop = (shopMap.get(String(location.shopId)) || {});
            const coords = location.coordinates?.coordinates || [90.4125 + index * 0.01, 23.8103 + index * 0.01];
            return {
                slug: shop.slug || `shop-${index + 1}`,
                name: shop.name || location.name || `Shop ${index + 1}`,
                description: "Multi-tenant storefront",
                rating: "4.7",
                verified: true,
                district: location.city || "Dhaka",
                thana: location.city || "Dhaka",
                market: "Main Market",
                category: "General",
                address: location.address || "Address pending",
                lat: coords[1],
                lng: coords[0],
            };
        });
    }
    catch {
        return [];
    }
}
export async function getShopBySlug(slug) {
    try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/shops/public`, { cache: "no-store" }).then((res) => res.json());
        const shops = response.data || [];
        return shops.find((shop) => shop.slug === slug || shop.domain === slug) || null;
    }
    catch {
        return null;
    }
}
