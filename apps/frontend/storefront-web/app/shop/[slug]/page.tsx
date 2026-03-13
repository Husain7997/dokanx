import { AnalyticsCards, ShopCard } from "@dokanx/ui";

import { StorefrontProductGrid } from "@/components/storefront-product-grid";

export default async function ShopDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;

  return (
    <div className="grid gap-6">
      <ShopCard
        name={slug.toUpperCase()}
        description="Shop detail is wired for tenant-aware storefront rendering."
        rating="4.8"
        verified
      />
      <AnalyticsCards
        items={[
          { label: "Catalog", value: "24 products" },
          { label: "Trust Score", value: "96%" },
          { label: "Fulfillment", value: "Fast courier" },
          { label: "Currency", value: "BDT" }
        ]}
      />
      <StorefrontProductGrid
        products={[
          {
            id: "demo-headphones",
            slug: "demo-headphones",
            name: "Tenant Product",
            price: 1200,
            image: "https://placehold.co/800x600",
            category: "Featured",
            stock: 12
          },
        ]}
      />
    </div>
  );
}
