import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createOrderApi(client: ReturnTypeCreateApiClient): ApiModules["order"] {
  return {
    list: () => client.request("/orders"),
    detail: (orderId) => client.request(`/orders/${orderId}`),
    create: (body) => client.request("/orders", { method: "POST", body }),
    track: (orderId) => client.request(`/orders/${orderId}`)
  };
}
