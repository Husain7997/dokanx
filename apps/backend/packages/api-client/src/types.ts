import type {
  AnalyticsMetric,
  ApiEnvelope,
  AuthResponse,
  Cart,
  CourierRecord,
  InventoryRecord,
  MarketplaceApp,
  Order,
  Product,
  Review,
  TenantConfig,
  WalletSummary
} from "@dokanx/types";

export type { ApiEnvelope } from "@dokanx/types";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiClientRequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  retry?: number;
  skipAuthRefresh?: boolean;
};

export type NextFetchRequestConfig = {
  revalidate?: number | false;
  tags?: string[];
};

export type ApiClientContext = {
  tenant?: TenantConfig | null;
};

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getRefreshToken?: () => string | null;
  getTenant?: () => TenantConfig | null;
  onSessionUpdate?: (session: AuthResponse) => void;
  onUnauthorized?: () => void;
  onError?: (error: Error) => void;
  refreshSession?: (refreshToken: string) => Promise<AuthResponse>;
};

export type ApiListResponse<T> = ApiEnvelope<T[]> & {
  count?: number;
};

export type ApiModules = {
  auth: {
    login: (payload: { email: string; password: string }) => Promise<AuthResponse>;
    logout: (payload: { refreshToken: string | null }) => Promise<{ success: boolean }>;
    refresh: (payload: { refreshToken: string }) => Promise<AuthResponse>;
    me: () => Promise<ApiEnvelope<never> & { user?: AuthResponse["user"] }>;
    sessions: () => Promise<ApiEnvelope<Array<Record<string, unknown>>>>;
  };
  product: {
    list: (query?: Record<string, string | number | boolean | undefined>) => Promise<ApiListResponse<Product>>;
    detail: (productId: string) => Promise<ApiEnvelope<Product>>;
    search: (query: Record<string, string | number | boolean | undefined>) => Promise<ApiListResponse<Product>>;
    inventory: (productId: string) => Promise<ApiEnvelope<InventoryRecord>>;
  };
  cart: {
    get: (query?: Record<string, string | number | boolean | undefined>) => Promise<ApiEnvelope<Cart>>;
    add: (payload: { productId: string; quantity: number }) => Promise<ApiEnvelope<Cart>>;
    update: (payload: { itemId: string; quantity: number }) => Promise<ApiEnvelope<Cart>>;
    clear: () => Promise<ApiEnvelope<Cart>>;
  };
  order: {
    list: () => Promise<ApiListResponse<Order>>;
    detail: (orderId: string) => Promise<ApiEnvelope<Order>>;
    create: (payload: Record<string, unknown>) => Promise<ApiEnvelope<Order>>;
    track: (orderId: string) => Promise<ApiEnvelope<Order>>;
  };
  inventory: {
    list: () => Promise<ApiListResponse<InventoryRecord>>;
    adjust: (payload: Record<string, unknown>) => Promise<ApiEnvelope<InventoryRecord>>;
    alerts: () => Promise<ApiEnvelope<InventoryRecord[]>>;
  };
  wallet: {
    summary: () => Promise<ApiEnvelope<WalletSummary>>;
    topup: (payload: { amount: number }) => Promise<ApiEnvelope<WalletSummary>>;
    transfer: (payload: { amount: number; toWalletId?: string }) => Promise<ApiEnvelope<WalletSummary>>;
  };
  analytics: {
    warehouse: () => Promise<ApiEnvelope<AnalyticsMetric[]>>;
    buildWarehouse: () => Promise<ApiEnvelope<{ success: boolean }>>;
    adminMetrics: () => Promise<ApiEnvelope<Record<string, unknown>>>;
  };
  courier: {
    dashboard: () => Promise<ApiEnvelope<Record<string, unknown>>>;
    anomalies: () => Promise<ApiEnvelope<CourierRecord[]>>;
    tracking: (trackingNumber: string) => Promise<ApiEnvelope<CourierRecord>>;
  };
  review: {
    productReviews: (productId: string) => Promise<ApiEnvelope<Review[]>>;
    createProductReview: (payload: Record<string, unknown>) => Promise<ApiEnvelope<Review>>;
    shopReviews: () => Promise<ApiEnvelope<Review[]>>;
  };
  marketplace: {
    list: () => Promise<ApiEnvelope<MarketplaceApp[]>>;
    installed: () => Promise<ApiEnvelope<MarketplaceApp[]>>;
    adminList: () => Promise<ApiEnvelope<MarketplaceApp[]>>;
  };
};
