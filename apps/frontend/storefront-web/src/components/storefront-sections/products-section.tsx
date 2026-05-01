"use client";

import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import type { HomepageSection } from "@/lib/theme-config";

import { SectionShell } from "./section-shell";

type ProductRow = {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
  shopId?: string;
  image?: string;
  slug?: string;
};

const COLLECTION_MAP: Record<string, string> = {
  recommended: "home-smart",
  featured: "home-featured",
  flash: "home-flash",
  recent: "home-recent",
};

export function ProductsSection({
  section,
  shopId,
  products,
}: {
  section: HomepageSection;
  shopId?: string;
  products: ProductRow[];
}) {
  const collection = section.config?.productCollection || "recommended";
  const limit = Number(section.config?.maxItems || 0);
  const list = limit ? products.slice(0, limit) : products;
  const columns = Number(section.config?.productColumns || 0) || undefined;

  return (
    <SectionShell
      sectionId={section.id}
      sectionType={section.type}
      shopId={shopId}
      title={section.title}
      subtitle={section.subtitle}
      ctaLabel={section.ctaLabel}
      ctaLink={section.ctaLink || "/products"}
      tone={section.style}
    >
      <StorefrontProductGrid
        products={list}
        trackingContext={COLLECTION_MAP[collection] || "home-smart"}
        columnsOverride={columns}
      />
    </SectionShell>
  );
}
