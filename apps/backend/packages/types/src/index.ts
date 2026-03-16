export type AuthRole = "admin" | "merchant" | "staff" | "customer" | "developer";

export type TenantConfig = {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  currency: string;
  language: string;
  theme: "light" | "dark" | "merchant-theme" | "admin-theme" | "storefront-theme";
  domain?: string | null;
  subdomain?: string | null;
};

export type TenantResolution = {
  hostname: string;
  mode: "subdomain" | "custom-domain" | "root";
  tenantKey: string | null;
};

export type ApiErrorPayload = {
  success?: false;
  message: string;
  errors?: string[];
  statusCode?: number;
};

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  user?: T;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  shopId?: string | null | Record<string, unknown>;
  lang?: string;
};

export type SessionUser = {
  _id?: string;
  id: string;
  name?: string;
  email: string;
  role: string;
  phone?: string | null;
  shopId?: string | null;
};

export type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  user: SessionUser | null;
  status: "anonymous" | "authenticated" | "restoring";
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: SessionUser;
};

export type Product = {
  _id?: string;
  id: string;
  slug?: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  price: number;
  stock?: number;
  image?: string;
  shopId?: string;
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
};

export type Cart = {
  id?: string;
  items: CartItem[];
  totals?: {
    subtotal: number;
    quantity: number;
    itemCount: number;
  };
};

export type Order = {
  _id?: string;
  id: string;
  status: string;
  totalAmount: number;
  items?: Array<{ product: string; quantity: number; price: number }>;
  createdAt?: string;
  shopId?: string;
};

export type InventoryRecord = {
  id?: string;
  productId: string;
  available: number;
  reserved?: number;
  reorderPoint?: number;
  warehouseId?: string;
};

export type WalletSummary = {
  id?: string;
  balance: number;
  withdrawable?: number;
  pendingSettlement?: number;
  frozen?: boolean;
  currency: string;
};

export type AnalyticsMetric = {
  id: string;
  label: string;
  value: number;
  change?: number;
};

export type CourierRecord = {
  id: string;
  provider?: string;
  status: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
};

export type Review = {
  id: string;
  productId?: string;
  orderId?: string;
  rating: number;
  reviewText?: string;
  author?: string;
  createdAt?: string;
};

export type MarketplaceApp = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  installed?: boolean;
  category?: string;
};

export type AdminHealthMetric = {
  id: string;
  label: string;
  status: "healthy" | "warning" | "critical";
  value?: string | number;
};
