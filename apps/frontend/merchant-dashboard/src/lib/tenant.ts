import type { TenantConfig } from "@dokanx/types";

export function getDashboardTenantConfig(): TenantConfig {
  return {
    id: "merchant-dashboard",
    slug: "merchant-dashboard",
    name: "Merchant Workspace",
    currency: "BDT",
    language: "en",
    theme: "merchant-theme",
    logo: null
  };
}
