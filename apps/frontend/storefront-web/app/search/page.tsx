import { SearchBar } from "@dokanx/ui";
import { headers } from "next/headers";

import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import { getProductsData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const q = (await searchParams).q || "";
  const products = await getProductsData(tenant, { q });

  return (
    <div className="grid gap-6">
      <SearchBar defaultValue={q} />
      <StorefrontProductGrid products={products} />
    </div>
  );
}
