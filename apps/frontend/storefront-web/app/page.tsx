import { headers } from "next/headers";

import { getHomePageData, getProductsData, getShopsDirectory } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";
import { CustomerHomeWorkspace } from "@/components/customer-home-workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const { products: productsData } = await getHomePageData(tenant);
  const [shops, recommendedProducts] = await Promise.all([
    getShopsDirectory(),
    getProductsData(tenant, { limit: "12" }),
  ]);
  const featuredProducts = productsData.slice(0, 8);
  const flashDeals = recommendedProducts.slice(0, 4);

  return (
    <CustomerHomeWorkspace
      shops={shops}
      featuredProducts={featuredProducts}
      recommendedProducts={recommendedProducts}
      flashDeals={flashDeals}
    />
  );
}
