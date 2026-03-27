export * from "./types";
export * from "./client";
export * from "./modules/auth.api";
export * from "./modules/product.api";
export * from "./modules/cart.api";
export * from "./modules/order.api";
export * from "./modules/inventory.api";
export * from "./modules/wallet.api";
export * from "./modules/analytics.api";
export * from "./modules/courier.api";
export * from "./modules/review.api";
export * from "./modules/marketplace.api";
export * from "./modules/recommendation.api";
import { createApiClient } from "./client";
import { createAnalyticsApi } from "./modules/analytics.api";
import { createAuthApi } from "./modules/auth.api";
import { createCartApi } from "./modules/cart.api";
import { createCourierApi } from "./modules/courier.api";
import { createInventoryApi } from "./modules/inventory.api";
import { createMarketplaceApi } from "./modules/marketplace.api";
import { createRecommendationApi } from "./modules/recommendation.api";
import { createOrderApi } from "./modules/order.api";
import { createProductApi } from "./modules/product.api";
import { createReviewApi } from "./modules/review.api";
import { createWalletApi } from "./modules/wallet.api";
import type { ApiClientOptions, ApiModules } from "./types";

export function createDokanxApi(options: ApiClientOptions): ApiModules {
  const client = createApiClient(options);

  return {
    auth: createAuthApi(client),
    product: createProductApi(client),
    cart: createCartApi(client),
    order: createOrderApi(client),
    inventory: createInventoryApi(client),
    wallet: createWalletApi(client),
    analytics: createAnalyticsApi(client),
    courier: createCourierApi(client),
    review: createReviewApi(client),
    marketplace: createMarketplaceApi(client),
    recommendation: createRecommendationApi(client)
  };
}
