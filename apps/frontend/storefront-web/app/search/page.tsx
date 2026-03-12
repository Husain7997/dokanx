import { ProductGrid, SearchBar } from "@dokanx/ui";
import { headers } from "next/headers";

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
      <ProductGrid
        products={products.map((product) => ({
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
