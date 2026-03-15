import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createAnalyticsApi(client: ReturnTypeCreateApiClient): ApiModules["analytics"] {
  return {
    warehouse: () => client.request("/analytics/warehouse"),
    buildWarehouse: () => client.request("/analytics/warehouse/build", { method: "POST" }),
    adminMetrics: () => client.request("/admin/metrics")
  };
}
