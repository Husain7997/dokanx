import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createAuthApi(client: ReturnTypeCreateApiClient): ApiModules["auth"] {
  return {
    login: (body) => client.request("/auth/login", { method: "POST", body }),
    logout: (body) => client.request("/auth/logout", { method: "POST", body, skipAuthRefresh: true }),
    refresh: (body) => client.request("/auth/refresh", { method: "POST", body, skipAuthRefresh: true }),
    me: () => client.request("/me"),
    sessions: () => client.request("/auth/sessions")
  };
}
