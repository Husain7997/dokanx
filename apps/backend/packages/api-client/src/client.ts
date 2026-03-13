import { buildTenantHeaders } from "@dokanx/utils";

import type {
  ApiClientOptions,
  ApiClientRequestOptions,
  ApiEnvelope
} from "./types";

function buildUrl(baseUrl: string, path: string, query?: ApiClientRequestOptions["query"]) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBase);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export function createApiClient({
  baseUrl,
  getAccessToken,
  getRefreshToken,
  getTenant,
  onSessionUpdate,
  onUnauthorized,
  onError,
  refreshSession
}: ApiClientOptions) {
  async function execute<T>(path: string, options: ApiClientRequestOptions = {}) {
    const token = getAccessToken?.();
    const tenant = getTenant?.();
    const response = await fetch(buildUrl(baseUrl, path, options.query), {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildTenantHeaders(tenant),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: options.cache,
      next: options.next
    } as RequestInit & { next?: ApiClientRequestOptions["next"] });

    if (response.status === 401 && !options.skipAuthRefresh && refreshSession) {
      const refreshToken = getRefreshToken?.();

      if (refreshToken) {
        try {
          const nextSession = await refreshSession(refreshToken);
          onSessionUpdate?.(nextSession);

          return execute<T>(path, {
            ...options,
            skipAuthRefresh: true
          });
        } catch (error) {
          onUnauthorized?.();
          throw error;
        }
      }

      onUnauthorized?.();
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<never> | null;
      const error = new Error(payload?.message || `API request failed for ${path}`);
      onError?.(error);
      throw error;
    }

    return (await response.json()) as T;
  }

  return {
    request: execute
  };
}
