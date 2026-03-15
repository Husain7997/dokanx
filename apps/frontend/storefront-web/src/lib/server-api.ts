import { createDokanxApi } from "@dokanx/api-client";
import type { TenantConfig } from "@dokanx/types";
import { getApiBaseUrl } from "@dokanx/utils";

export function createServerApi(tenant: TenantConfig | null) {
  return createDokanxApi({
    baseUrl: getApiBaseUrl(),
    getTenant: () => tenant
  });
}
