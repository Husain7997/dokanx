import type { ApiModules } from "../types";
import type { ReturnTypeCreateApiClient } from "./shared";

export function createRecommendationApi(client: ReturnTypeCreateApiClient): ApiModules["recommendation"] {
  return {
    home: (query) => client.request("/recommendations/home", { query }),
    product: (productId, query) => client.request(`/recommendations/product/${productId}`, { query }),
    shop: (shopId, query) => client.request(`/recommendations/shop/${shopId}`, { query }),
    trending: (query) => client.request("/recommendations/trending", { query })
  };
}
