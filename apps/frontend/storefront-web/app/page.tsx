import { AnalyticsCards, Card, CardTitle, ProductGrid } from "@dokanx/ui";
import { headers } from "next/headers";

import { createServerApi } from "@/lib/server-api";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const serverApi = createServerApi(tenant);
  const [productsResponse, appsResponse] = await Promise.all([
    serverApi.product.list(),
    serverApi.marketplace.list()
  ]);
  const products = (productsResponse.data || []).slice(0, 4).map((product) => ({
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
          { label: "Live Products", value: String(productsResponse.count || products.length) },
          { label: "Marketplace Apps", value: String((appsResponse.data || []).length) },
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
