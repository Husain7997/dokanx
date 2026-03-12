"use client";

import { useMemo } from "react";

import type { TenantConfig } from "@dokanx/types";

export function useTenant(tenant: TenantConfig | null) {
  return useMemo(
    () => ({
      tenant,
      currency: tenant?.currency || "BDT",
      language: tenant?.language || "en",
      theme: tenant?.theme || "storefront-theme"
    }),
    [tenant]
  );
}
