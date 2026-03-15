import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createProductApi(client: ReturnTypeCreateApiClient): ApiModules["product"] {
  return {
    list: (query) => client.request("/products", { query }),
    detail: (productId) => client.request(`/products/${productId}`),
    search: (query) => client.request("/search/products", { query }),
    inventory: (productId) => client.request(`/products/${productId}/inventory`)
  };
}
