"use client";

import { useEffect, useRef } from "react";

import { trackStorefrontSectionImpression } from "@/lib/runtime-api";
import { useStorefrontTheme } from "@/components/storefront-theme-provider";

type StorefrontSectionTrackerProps = {
  sectionId: string;
  sectionType: string;
  shopId?: string;
  context?: string;
};

export function StorefrontSectionTracker({
  sectionId,
  sectionType,
  shopId,
  context = "storefront-home",
}: StorefrontSectionTrackerProps) {
  const { themeId } = useStorefrontTheme();
  const ref = useRef<HTMLDivElement | null>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || trackedRef.current || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || trackedRef.current) return;
        trackedRef.current = true;
        trackStorefrontSectionImpression({
          sectionId,
          sectionType,
          themeId,
          shopId,
          context,
          host: window.location.host,
        }).catch(() => undefined);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [context, sectionId, sectionType, shopId, themeId]);

  return <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden="true" />;
}
