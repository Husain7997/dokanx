import { AnalyticsCards, Card, CardTitle, ProductGrid } from "@dokanx/ui";
import { headers } from "next/headers";

import { getHomePageData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const { products: productsData, productCount, apps } = await getHomePageData(tenant);
  const products = productsData.slice(0, 4).map((product) => ({
    title: product.name,
    price: product.price,
    image: product.image || "https://placehold.co/800x600",
    category: product.category,
    status: "Live",
    inStock: (product.stock || 0) > 0
  }));

  return (
    <div className="grid gap-6">
      <AnalyticsCards
        items={[
          { label: "Tenant", value: tenant.name, meta: tenant.currency },
          { label: "Live Products", value: String(productCount || products.length) },
          { label: "Marketplace Apps", value: String(apps.length) },
          { label: "Theme", value: tenant.theme }
        ]}
      />
      <Card>
        <CardTitle>Featured Inventory</CardTitle>
        <div className="mt-6">
          <ProductGrid products={products} />
        </div>
      </Card>
    </div>
  );
}
