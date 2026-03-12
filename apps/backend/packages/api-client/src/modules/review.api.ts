import type { ApiModules } from "../types";

import type { ReturnTypeCreateApiClient } from "./shared";

export function createReviewApi(client: ReturnTypeCreateApiClient): ApiModules["review"] {
  return {
    productReviews: (productId) => client.request(`/trust/products/${productId}/reviews`),
    createProductReview: (body) =>
      client.request("/trust/product-reviews", { method: "POST", body }),
    shopReviews: () => client.request("/trust/shop-reviews")
  };
}
