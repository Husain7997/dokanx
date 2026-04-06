import type { TenantConfig } from "@dokanx/types";

export function getAdminTenantConfig(): TenantConfig {
  return {
    id: "admin-panel",
    slug: "admin-panel",
    name: "DokanX Admin",
    currency: "BDT",
    language: "en",
    theme: "admin-theme",
    logo: null
  };
}

