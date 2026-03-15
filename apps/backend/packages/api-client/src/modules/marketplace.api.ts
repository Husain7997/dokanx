import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createMarketplaceApi(
  client: ReturnTypeCreateApiClient
): ApiModules["marketplace"] {
  return {
    list: () => client.request("/apps"),
    installed: () => client.request("/apps/installed"),
    adminList: () => client.request("/admin/apps")
  };
}
