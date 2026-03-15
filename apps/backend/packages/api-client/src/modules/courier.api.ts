import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createCourierApi(client: ReturnTypeCreateApiClient): ApiModules["courier"] {
  return {
    dashboard: () => client.request("/courier/dashboard"),
    anomalies: () => client.request("/courier/anomalies"),
    tracking: (trackingNumber) =>
      client.request(`/courier/track/${trackingNumber}`)
  };
}
