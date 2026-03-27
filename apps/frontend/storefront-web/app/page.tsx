import { headers } from "next/headers";

import { getHomePageData, getHomeRecommendations, getProductsData, getShopsDirectory } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";
import { CustomerHomeWorkspace } from "@/components/customer-home-workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const { products: productsData } = await getHomePageData(tenant);
  const [shops, recommendations, recommendedProducts] = await Promise.all([
    getShopsDirectory(),
    getHomeRecommendations(tenant),
    getProductsData(tenant, { limit: "12" }),
  ]);
  const featuredProducts = (recommendations.trending_products as typeof productsData) || productsData.slice(0, 8);
  const recommendedForYou =
    (recommendations.recommended_products as typeof productsData) || recommendedProducts.slice(0, 12);
  const flashDeals =
    (recommendations.flash_deals as typeof productsData) || recommendedProducts.slice(0, 4);
  const recentViews = (recommendations.recently_viewed as typeof productsData) || [];
  const popularShops =
    (recommendations.popular_shops as Array<{
      _id?: string;
      name?: string;
      slug?: string;
      logoUrl?: string;
      city?: string;
      country?: string;
      trustScore?: number;
      popularityScore?: number;
    }>) || [];

  return (
    <CustomerHomeWorkspace
      shops={shops}
      featuredProducts={featuredProducts}
      recommendedProducts={recommendedForYou}
      flashDeals={flashDeals}
      recentlyViewed={recentViews}
      recommendedShops={popularShops}
    />
  );
}
