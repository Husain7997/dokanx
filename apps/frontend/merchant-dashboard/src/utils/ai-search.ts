import { searchAISuggestions } from "@/lib/runtime-api";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  shopId: string;
  shopName: string;
  image?: string;
  tags?: string[];
  category?: string;
}

/**
 * AI-powered product search with smart suggestions
 * This is a placeholder for actual AI integration
 */
export async function searchProductsAI(
  query: string,
  allProducts: Product[],
  userPreferences?: {
    maxPrice?: number;
    preferredShops?: string[];
    location?: { lat: number; lng: number };
  }
): Promise<Product[]> {
  if (query.trim().length >= 2) {
    try {
      const response = await searchAISuggestions(query, 8);
      const aiProducts = (response.data || [])
        .filter((item) => item.entityType === "product")
        .map((item) => {
          const localMatch = allProducts.find((product) => product.id === item.id);
          return {
            id: item.id || localMatch?.id || "",
            name: item.name || localMatch?.name || "",
            price: localMatch?.price ?? 0,
            stock: localMatch?.stock ?? 0,
            shopId: localMatch?.shopId || "",
            shopName: localMatch?.shopName || "",
            image: localMatch?.image,
            category: localMatch?.category,
            tags: localMatch?.tags,
          } as Product;
        })
        .filter((product) => product.id && product.name);
      if (aiProducts.length) {
        return aiProducts;
      }
    } catch (err) {
      console.warn("AI suggestion fallback error:", err);
    }
  }

  // Simulate AI processing delay for fallback
  await new Promise((resolve) => setTimeout(resolve, 200));
  const lowerQuery = query.toLowerCase();

  // Basic AI-like filtering
  let filtered = allProducts.filter((product) => {
    const searchableText = `${product.name} ${product.shopName} ${product.tags?.join(" ") || ""} ${product.category || ""}`.toLowerCase();
    return searchableText.includes(lowerQuery);
  });

  // Apply user preferences
  const maxPrice = userPreferences?.maxPrice;
  if (maxPrice != null) {
    filtered = filtered.filter((p) => p.price <= maxPrice);
  }

  const preferredShops = userPreferences?.preferredShops;
  if (preferredShops?.length) {
    filtered = filtered.filter((p) => preferredShops.includes(p.shopId));
  }

  // Sort by relevance (price, stock, shop preference)
  filtered.sort((a, b) => {
    if (a.stock > 0 && b.stock === 0) return -1;
    if (a.stock === 0 && b.stock > 0) return 1;
    if (a.price !== b.price) return a.price - b.price;
    const aPreferred = userPreferences?.preferredShops?.includes(a.shopId) ? 1 : 0;
    const bPreferred = userPreferences?.preferredShops?.includes(b.shopId) ? 1 : 0;
    return bPreferred - aPreferred;
  });

  return filtered.slice(0, 10);
}

/**
 * Get AI-powered price comparison suggestions
 */
export async function getPriceComparison(
  productName: string,
  allProducts: Product[]
): Promise<{
  cheapest: Product | null;
  averagePrice: number;
  priceRange: { min: number; max: number };
  suggestions: Product[];
}> {
  await new Promise(resolve => setTimeout(resolve, 150));

  const similarProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productName.toLowerCase()) ||
    productName.toLowerCase().includes(p.name.toLowerCase())
  );

  if (similarProducts.length === 0) {
    return {
      cheapest: null,
      averagePrice: 0,
      priceRange: { min: 0, max: 0 },
      suggestions: [],
    };
  }

  const prices = similarProducts.map(p => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  const cheapest = similarProducts.find(p => p.price === min) || null;

  // Get top 3 cheapest options
  const suggestions = similarProducts
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);

  return {
    cheapest,
    averagePrice: average,
    priceRange: { min, max },
    suggestions,
  };
}

/**
 * AI delivery optimization suggestions
 */
export async function optimizeDeliveryRoute(
  shops: Array<{ id: string; location: { lat: number; lng: number } }>,
  customerLocation: { lat: number; lng: number }
): Promise<{
  optimalOrder: string[];
  estimatedTime: number;
  totalDistance: number;
}> {
  await new Promise(resolve => setTimeout(resolve, 300));

  // Simple nearest neighbor algorithm (can be replaced with real TSP solver)
  const remaining = [...shops];
  const route: string[] = [];
  let currentLocation = customerLocation;
  let totalDistance = 0;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(currentLocation, remaining[0].location);

    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(currentLocation, remaining[i].location);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const nearest = remaining.splice(nearestIndex, 1)[0];
    route.push(nearest.id);
    currentLocation = nearest.location;
    totalDistance += nearestDistance;
  }

  // Estimate time (assuming 30 km/h average speed)
  const estimatedTime = (totalDistance / 30) * 60; // minutes

  return {
    optimalOrder: route,
    estimatedTime,
    totalDistance,
  };
}

function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = Math.toRadians(point2.lat - point1.lat);
  const dLng = Math.toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(Math.toRadians(point1.lat)) * Math.cos(Math.toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extend Math object for radians conversion
declare global {
  interface Math {
    toRadians(degrees: number): number;
  }
}

Math.toRadians = function(degrees: number): number {
  return degrees * (Math.PI / 180);
};