import { API_RETRY_COUNT, API_RETRY_STATUS_CODES, API_TIMEOUT_MS } from "./constants";
import { captureException } from "./sentry";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  method?: RequestMethod;
  body?: Record<string, unknown> | null;
  token?: string | null;
  tenantId?: string | null;
  cartToken?: string | null;
  retryCount?: number;
  headers?: Record<string, string>;
};

type ErrorPayload = {
  message?: string;
};

let unauthorizedHandler: null | (() => void | Promise<void>) = null;

export function registerUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
  unauthorizedHandler = handler;
}

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function isRetryableStatus(status: number) {
  return API_RETRY_STATUS_CODES.includes(status);
}

function isRetryableError(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && error.name === "AbortError");
}

function normalizeRequestError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return new Error("The request timed out. Please try again.");
    }

    if (/network request failed/i.test(error.message)) {
      return new Error("Unable to reach the server. Check your connection and try again.");
    }

    return error;
  }

  return new Error("Request failed");
}

export async function apiRequest<T>(baseUrl: string, path: string, options: ApiRequestOptions = {}) {
  const retries = options.retryCount ?? API_RETRY_COUNT;
  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(buildUrl(baseUrl, path), {
        method: options.method ?? "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(options.tenantId ? { "x-tenant-id": options.tenantId } : {}),
          ...(options.cartToken ? { "x-cart-token": options.cartToken } : {}),
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const payload = (await response.json().catch(() => null)) as T | ErrorPayload | null;

      if (response.status === 401) {
        await unauthorizedHandler?.();
        throw new Error("Session expired. Please sign in again.");
      }

      if (!response.ok) {
        const message = (payload as ErrorPayload | null)?.message || "Request failed";

        if (isRetryableStatus(response.status) && attempt < retries) {
          attempt += 1;
          continue;
        }

        throw new Error(message);
      }

      return payload as T;
    } catch (error) {
      if (attempt < retries && isRetryableError(error)) {
        attempt += 1;
        continue;
      }

      const normalizedError = normalizeRequestError(error);
      captureException(normalizedError, { path, method: options.method ?? "GET" });
      throw normalizedError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Request failed");
}