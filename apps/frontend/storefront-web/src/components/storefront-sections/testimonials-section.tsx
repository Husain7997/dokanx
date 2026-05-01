"use client";

import { Button, Grid, ShopCard } from "@dokanx/ui";
import Link from "next/link";

import type { HomepageSection } from "@/lib/theme-config";

import { SectionShell } from "./section-shell";

type RecommendedShop = {
  _id?: string;
  name?: string;
  slug?: string;
  logoUrl?: string;
  city?: string;
  country?: string;
  trustScore?: number;
  popularityScore?: number;
};

export function TestimonialsSection({
  section,
  shopId,
  shops,
}: {
  section: HomepageSection;
  shopId?: string;
  shops: RecommendedShop[];
}) {
  return (
    <SectionShell
      sectionId={section.id}
      sectionType={section.type}
      shopId={shopId}
      title={section.title}
      subtitle={section.subtitle}
      ctaLabel={section.ctaLabel}
      ctaLink={section.ctaLink || "/shops"}
      tone={section.style}
    >
      <Grid minColumnWidth="220px" className="gap-4">
        {shops.map((shop, index) => (
          <div key={String(shop._id || shop.slug || index)} className="space-y-3">
            <ShopCard
              name={shop.name || "Shop"}
              description={[shop.city, shop.country].filter(Boolean).join(", ") || "Marketplace partner"}
              rating={(shop.trustScore ? (shop.trustScore / 20).toFixed(1) : 4.6).toString()}
              verified={(shop.trustScore || 0) >= 70}
              status={index % 3 === 0 ? "closed" : "open"}
            />
            {shop.slug ? (
              <Button asChild size="sm" className="w-full">
                <Link href={`/shop/${shop.slug}`}>Visit shop</Link>
              </Button>
            ) : null}
          </div>
        ))}
      </Grid>
    </SectionShell>
  );
}
