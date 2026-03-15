import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createWalletApi(client: ReturnTypeCreateApiClient): ApiModules["wallet"] {
  return {
    summary: () => client.request("/shop/wallet"),
    topup: (body) => client.request("/shop/wallet/topup", { method: "POST", body }),
    transfer: (body) => client.request("/shop/wallet/transfer", { method: "POST", body })
  };
}
