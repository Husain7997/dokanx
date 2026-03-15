import type { TenantConfig } from "@dokanx/types";

export function getAdminTenantConfig(): TenantConfig {
  return {
    id: "admin-panel",
    slug: "admin-panel",
    name: "Admin Control",
    currency: "BDT",
    language: "en",
    theme: "admin-theme",
    logo: null
  };
}
