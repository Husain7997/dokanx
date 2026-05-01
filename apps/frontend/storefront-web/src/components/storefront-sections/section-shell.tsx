"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@dokanx/ui";

import { trackStorefrontSectionClick } from "@/lib/runtime-api";
import { useStorefrontTheme } from "@/components/storefront-theme-provider";
import { StorefrontSectionTracker } from "./storefront-section-tracker";

export function SectionShell({
  sectionId,
  sectionType,
  shopId,
  title,
  subtitle,
  ctaLabel,
  ctaLink,
  tone = "default",
  children,
}: {
  sectionId: string;
  sectionType: string;
  shopId?: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaLink?: string;
  tone?: "default" | "accent" | "minimal";
  children?: ReactNode;
}) {
  const { themeId } = useStorefrontTheme();
  const panelClass =
    tone === "accent"
      ? "rounded-[1.75rem] border border-border/60 bg-[linear-gradient(140deg,rgba(255,122,0,0.14),rgba(15,23,42,0.06))] p-6"
      : tone === "minimal"
        ? "rounded-[1.5rem] border border-border/40 bg-transparent p-5"
        : "rounded-[1.5rem] border border-border/60 bg-card/60 p-6";

  return (
    <div className={`relative grid gap-6 ${panelClass}`}>
      <StorefrontSectionTracker sectionId={sectionId} sectionType={sectionType} shopId={shopId} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {ctaLink ? (
          <Button asChild variant="secondary">
            <Link
              href={ctaLink}
              onClick={() => {
                if (typeof window === "undefined") return;
                trackStorefrontSectionClick({
                  sectionId,
                  sectionType,
                  themeId,
                  shopId,
                  ctaLink,
                  context: "storefront-home",
                  host: window.location.host,
                }).catch(() => undefined);
              }}
            >
              {ctaLabel || "View all"}
            </Link>
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
