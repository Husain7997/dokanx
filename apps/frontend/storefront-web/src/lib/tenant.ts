import type { TenantConfig } from "@dokanx/types";
import { resolveTenantFromHostname } from "@dokanx/utils";

export function getTenantConfig(hostname: string): TenantConfig {
  const resolution = resolveTenantFromHostname(hostname);
  const slug = resolution.tenantKey || "dokanx";

  return {
    id: slug,
    slug,
    name: slug === "dokanx" ? "DokanX" : `${slug.toUpperCase()} Store`,
    currency: "BDT",
    language: "en",
    theme: "storefront-theme",
    logo: null,
    subdomain: resolution.mode === "subdomain" ? slug : null,
    domain: resolution.mode === "custom-domain" ? hostname : null
  };
}
