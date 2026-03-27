"use client";

import { createDokanxApi } from "@dokanx/api-client";
import { useAuthStore } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

export const api = createDokanxApi({
  baseUrl: getApiBaseUrl(),
  getAccessToken: () => useAuthStore.getState().accessToken,
  getTenant: () => useAuthStore.getState().tenant,
  onUnauthorized: () => useAuthStore.getState().clearSession()
});
