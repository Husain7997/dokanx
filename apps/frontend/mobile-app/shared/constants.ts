export const DEFAULT_TENANT_ID = "demo-tenant";
export const API_TIMEOUT_MS = 15_000;
export const API_RETRY_COUNT = 2;
export const API_RETRY_STATUS_CODES = [500, 502, 503, 504];
export const VERSION_CHECK_PATH = "/api/public/mobile/version";
export const PRIVACY_POLICY_URL = "https://dokanx.com/privacy";

export const STORAGE_KEYS = {
  authTokenService: "dokanx.mobile.auth",
  cartService: "dokanx.mobile.cart",
  shopService: "dokanx.mobile.shop",
} as const;
