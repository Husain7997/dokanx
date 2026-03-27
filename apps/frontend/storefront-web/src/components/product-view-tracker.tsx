"use client";

import { useEffect } from "react";
import { trackProductView } from "@/lib/runtime-api";

export function ProductViewTracker({ productId, shopId }: { productId: string; shopId?: string }) {
  useEffect(() => {
    if (!productId) return;
    trackProductView({ productId, shopId }).catch(() => undefined);
  }, [productId, shopId]);

  return null;
}
