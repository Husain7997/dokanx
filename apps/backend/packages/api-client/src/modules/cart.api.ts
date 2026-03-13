import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createCartApi(client: ReturnTypeCreateApiClient): ApiModules["cart"] {
  return {
    get: (query) => client.request("/cart", { query }),
    add: (body) => client.request("/cart/items", { method: "POST", body }),
    update: (body) => client.request("/cart/items", { method: "PATCH", body }),
    clear: () => client.request("/cart/clear", { method: "POST" })
  };
}
