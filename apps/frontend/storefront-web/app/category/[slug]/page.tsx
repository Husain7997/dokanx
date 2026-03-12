import { ProductGrid } from "@dokanx/ui";
import { headers } from "next/headers";

import { createServerApi } from "@/lib/server-api";
import { getTenantConfig } from "@/lib/tenant";

export default async function CategoryPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const slug = (await params).slug;
  const response = await createServerApi(tenant).product.search({ category: slug });

  return (
    <ProductGrid
      products={(response.data || []).map((product) => ({
        title: product.name,
        price: product.price,
        image: product.image || "https://placehold.co/800x600",
        category: product.category,
        inStock: (product.stock || 0) > 0
      }))}
    />
  );
}
