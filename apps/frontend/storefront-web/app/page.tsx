import { AnalyticsCards, Card, CardTitle } from "@dokanx/ui";
import { headers } from "next/headers";

import { getHomePageData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";
import { StorefrontProductGrid } from "@/components/storefront-product-grid";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const { products: productsData, productCount, apps } = await getHomePageData(tenant);
  const products = productsData.slice(0, 4);

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
          <StorefrontProductGrid products={products} />
        </div>
      </Card>
    </div>
  );
}
