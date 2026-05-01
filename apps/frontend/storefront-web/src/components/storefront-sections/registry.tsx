"use client";

import type { ReactNode } from "react";
import type { HomepageSection } from "@/lib/theme-config";

import { HeroSection } from "./hero-section";
import { ProductsSection } from "./products-section";
import { ShopsSection } from "./shops-section";
import { TestimonialsSection } from "./testimonials-section";

type RenderContext = {
  shopName: string;
  shopId?: string;
  heroSearch?: ReactNode;
  featuredProducts: any[];
  recommendedProducts: any[];
  flashDeals: any[];
  recentlyViewed: any[];
  shops: any[];
  recommendedShops: any[];
};

export function renderHomepageSection(section: HomepageSection, context: RenderContext) {
  if (!section.enabled) return null;

  switch (section.type) {
    case "hero":
      return (
        <HeroSection
          key={section.id}
          section={section}
          shopName={context.shopName}
          shopId={context.shopId}
          showSearch
        >
          {context.heroSearch}
        </HeroSection>
      );
    case "featuredProducts": {
      const source = resolveProductCollection(section, context);
      return <ProductsSection key={section.id} section={section} shopId={context.shopId} products={source} />;
    }
    case "offers": {
      const source = resolveProductCollection(section, context);
      return <ProductsSection key={section.id} section={section} shopId={context.shopId} products={source} />;
    }
    case "categories":
      return <ShopsSection key={section.id} section={section} shopId={context.shopId} shops={context.shops} />;
    case "testimonials":
      return <TestimonialsSection key={section.id} section={section} shopId={context.shopId} shops={context.recommendedShops} />;
    default:
      return null;
  }
}

function resolveProductCollection(section: HomepageSection, context: RenderContext) {
  const collection = section.config?.productCollection || "recommended";
  switch (collection) {
    case "featured":
      return context.featuredProducts;
    case "flash":
      return context.flashDeals;
    case "recent":
      return context.recentlyViewed;
    default:
      return context.recommendedProducts;
  }
}
