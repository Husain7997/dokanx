import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createCartApi(client: ReturnTypeCreateApiClient): ApiModules["cart"] {
  return {
    get: (query) => client.request("/cart", { query }),
    save: (body) => client.request("/cart", { method: "PUT", body }),
    clear: (query) => client.request("/cart", { method: "DELETE", query }),
    merge: (body) => client.request("/cart/merge", { method: "POST", body }),
    applyCoupon: (body) => client.request("/cart/coupon", { method: "POST", body }),
    removeCoupon: () => client.request("/cart/coupon", { method: "DELETE" })
  };
}
