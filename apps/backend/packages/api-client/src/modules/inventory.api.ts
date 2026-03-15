import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createInventoryApi(client: ReturnTypeCreateApiClient): ApiModules["inventory"] {
  return {
    list: () => client.request("/inventory"),
    adjust: (body) => client.request("/inventory", { method: "POST", body }),
    alerts: () => client.request("/inventory/alerts")
  };
}
