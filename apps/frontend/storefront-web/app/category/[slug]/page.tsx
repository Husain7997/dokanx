import { headers } from "next/headers";

import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import { getProductsData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const slug = (await params).slug;
  const products = await getProductsData(tenant, { category: slug });

  return <StorefrontProductGrid products={products} />;
}
