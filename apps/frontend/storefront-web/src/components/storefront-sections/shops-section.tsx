"use client";

import { Button, Grid, ShopCard } from "@dokanx/ui";
import Link from "next/link";

import type { HomepageSection } from "@/lib/theme-config";

import { SectionShell } from "./section-shell";

type ShopDirectoryItem = {
  slug: string;
  name: string;
  description: string;
  rating: string;
  verified: boolean;
  district: string;
  thana: string;
  market: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
};

export function ShopsSection({
  section,
  shopId,
  shops,
}: {
  section: HomepageSection;
  shopId?: string;
  shops: ShopDirectoryItem[];
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
          <div key={shop.slug} className="space-y-3">
            <ShopCard
              name={shop.name}
              description={`${shop.district}, ${shop.thana}`}
              rating={shop.rating}
              verified={shop.verified}
              distance={`${(0.4 + index * 0.2).toFixed(1)} km`}
              status={index % 3 === 0 ? "closed" : "open"}
            />
            <Button asChild size="sm" className="w-full">
              <Link href={`/shop/${shop.slug}`}>Visit shop</Link>
            </Button>
          </div>
        ))}
      </Grid>
    </SectionShell>
  );
}
