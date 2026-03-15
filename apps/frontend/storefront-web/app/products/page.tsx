import { headers } from "next/headers";

import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import { getProductsData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const products = await getProductsData(tenant);

  return <StorefrontProductGrid products={products} />;
}
