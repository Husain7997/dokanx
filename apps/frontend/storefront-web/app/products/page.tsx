import { ProductGrid } from "@dokanx/ui";
import { headers } from "next/headers";

import { getProductsData } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const products = (await getProductsData(tenant)).map((product) => ({
    title: product.name,
    price: product.price,
    image: product.image || "https://placehold.co/800x600",
    category: product.category,
    inStock: (product.stock || 0) > 0
  }));

  return <ProductGrid products={products} />;
}
