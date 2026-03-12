import { ProductGrid, SearchBar } from "@dokanx/ui";
import { headers } from "next/headers";

import { createServerApi } from "@/lib/server-api";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const q = (await searchParams).q || "";
  const response = await createServerApi(tenant).product.search({ q });

  return (
    <div className="grid gap-6">
      <SearchBar defaultValue={q} />
      <ProductGrid
        products={(response.data || []).map((product) => ({
          title: product.name,
          price: product.price,
          image: product.image || "https://placehold.co/800x600",
          category: product.category,
          inStock: (product.stock || 0) > 0
        }))}
      />
    </div>
  );
}
