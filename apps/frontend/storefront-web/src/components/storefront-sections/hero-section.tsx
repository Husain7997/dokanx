"use client";

import Link from "next/link";
import { Button, Card, CardDescription, CardTitle, Logo } from "@dokanx/ui";

import type { HomepageSection } from "@/lib/theme-config";
import { trackStorefrontSectionClick } from "@/lib/runtime-api";
import { useStorefrontTheme } from "@/components/storefront-theme-provider";
import { StorefrontSectionTracker } from "./storefront-section-tracker";

export function HeroSection({
  section,
  shopName,
  shopId,
  showSearch,
  children,
}: {
  section: HomepageSection;
  shopName: string;
  shopId?: string;
  showSearch?: boolean;
  children?: React.ReactNode;
}) {
  const { themeId } = useStorefrontTheme();
  const heroLayout = section.config?.heroLayout || "split";
  const mediaFit = section.config?.mediaFit || "cover";
  const imageUrl = section.config?.imageUrl || "";
  const imageAlt = section.config?.imageAlt || section.title || shopName;

  return (
    <Card
      className={`relative overflow-hidden border-border/70 ${heroLayout === "immersive" ? "bg-[linear-gradient(145deg,var(--theme-primary),var(--theme-secondary))] text-[var(--theme-button-text)]" : "bg-card/92"}`}
    >
      <StorefrontSectionTracker sectionId={section.id} sectionType={section.type} shopId={shopId} />
      <div className={`grid gap-6 ${heroLayout === "split" ? "lg:grid-cols-[1.1fr_0.9fr]" : ""}`}>
        <div className={`p-6 sm:p-8 ${heroLayout === "centered" ? "text-center" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className={heroLayout === "centered" ? "mx-auto" : ""}>
              <Logo variant="full" size="lg" className="max-w-full" />
              <p className={`mt-4 text-xs uppercase tracking-[0.28em] ${heroLayout === "immersive" ? "text-white/70" : "text-muted-foreground"}`}>Customer super app</p>
            </div>
            <div className={`rounded-3xl border p-2 ${heroLayout === "immersive" ? "border-white/15 bg-white/10" : "border-border/70 bg-[linear-gradient(135deg,rgba(255,122,0,0.12),rgba(255,165,0,0.18))]"}`}>
              <Logo variant="icon" size="md" />
            </div>
          </div>
          <h1 className="dx-display mt-6 text-3xl sm:text-4xl">{section.title || shopName}</h1>
          <p className={`mt-3 max-w-2xl text-sm sm:text-base ${heroLayout === "centered" ? "mx-auto" : ""} ${heroLayout === "immersive" ? "text-white/78" : "text-muted-foreground"}`}>{section.subtitle}</p>
          {showSearch ? <div className="mt-5 grid gap-4">{children}</div> : null}
          <div className={`mt-5 flex flex-wrap gap-3 ${heroLayout === "centered" ? "justify-center" : ""}`}>
            <Button asChild variant={heroLayout === "immersive" ? "secondary" : undefined}>
              <Link
                href={section.ctaLink || "/products"}
                onClick={() => {
                  if (typeof window === "undefined") return;
                  trackStorefrontSectionClick({
                    sectionId: section.id,
                    sectionType: section.type,
                    themeId,
                    shopId,
                    ctaLink: section.ctaLink || "/products",
                    context: "storefront-home",
                    host: window.location.host,
                  }).catch(() => undefined);
                }}
              >
                {section.ctaLabel || "Browse products"}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/account">Open account</Link>
            </Button>
          </div>
        </div>
        {heroLayout !== "centered" ? (
          <div className={`p-6 sm:p-8 ${heroLayout === "immersive" ? "" : "border-t border-border/60 bg-background/70 lg:border-l lg:border-t-0"}`}>
            <CardTitle className={heroLayout === "immersive" ? "text-white" : ""}>Storefront highlights</CardTitle>
            <CardDescription className={`mt-2 ${heroLayout === "immersive" ? "text-white/70" : ""}`}>
              {imageUrl ? "Hero banner image configured." : "Theme hero uses a lightweight default banner."}
            </CardDescription>
            <div
              className={`mt-4 overflow-hidden rounded-[1.75rem] border ${heroLayout === "immersive" ? "border-white/10 bg-white/10" : "border-border/60 bg-card/80"} ${mediaFit === "soft" ? "p-4" : ""}`}
            >
              {imageUrl ? (
                <div
                  className="min-h-[220px] w-full rounded-[1.2rem]"
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: mediaFit === "contain" || mediaFit === "soft" ? "contain" : "cover",
                  }}
                  aria-label={imageAlt}
                  role="img"
                />
              ) : (
                <div className={`flex min-h-[220px] items-center justify-center px-6 text-center text-sm ${heroLayout === "immersive" ? "text-white/70" : "text-muted-foreground"}`}>
                  Add a hero image from the theme builder to personalize this space.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
