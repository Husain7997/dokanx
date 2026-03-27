# DokanX AI Recommendation System

## Goals
- Increase conversion via personalized product and shop recommendations.
- Provide fast, cached recommendation endpoints for customer surfaces.
- Reuse existing product catalog, analytics, and order data.

## Non-Goals (Phase 1)
- Real-time model training or deep learning ranking.
- Personalized recommendations for anonymous users beyond basic trending/popular.

---

## High-Level Architecture

Customer Apps
  -> API Gateway / BFF
    -> Recommendation Service
      -> Ranking Engine
      -> Feature Store / Cache (Redis)
      -> Data Access Layer
        -> Product Catalog Service
        -> Orders/Checkout Service
        -> Analytics/Event Store
        -> Shop Service

### Core Components
- **Recommendation Service**
  - Orchestrates candidate retrieval, scoring, ranking, and response shaping.
  - Provides cached responses for common requests (home, trending, similar).

- **Candidate Generators**
  - Trending Products
  - Popular Products
  - Recommended For You
  - Similar Products
  - Customers Also Bought
  - Nearby Popular Shops

- **Ranking Engine (Phase 1)**
  - Rule-based + weighted scoring from signals (views, orders, cart, wishlist).
  - Optional business rules (stock, visibility, moderation status).

- **Cache Layer**
  - Redis used for hot recommendations and precomputed lists.
  - TTL-based invalidation for trending and popular lists.

---

## Data Flow

1) **User Activity Capture**
   - Product views, searches, add-to-cart, wishlist adds, orders.
   - Stored in Analytics/Event Store.

2) **Feature Aggregation**
   - Batch job (hourly / daily) aggregates top items, co-purchase pairs, shop popularity.
   - Writes to Feature Store tables + Redis caches.

3) **Recommendation Query**
   - Customer app requests recommendations.
   - Service fetches user signals + candidates + ranking.
   - Results cached by user + context.

4) **Response Delivery**
   - API returns items with basic product/shop metadata.

---

## Recommendation Types (Phase 1)

1. **Trending Products**
   - Signals: last 24h/7d orders, views, wishlist, cart.
2. **Popular Products**
   - Signals: all-time or 30d orders and view counts.
3. **Recommended For You**
   - Signals: user views, search terms, cart items, order history.
4. **Similar Products**
   - Signals: same category/brand/price bucket + co-view.
5. **Customers Also Bought**
   - Signals: co-purchase pairs.
6. **Nearby Popular Shops**
   - Signals: shop orders + rating + distance.

---

## API Specification

Base: `/recommendations`

### 1) Home Recommendations
`GET /recommendations/home`

Query params:
- `user_id` (optional)
- `location` (optional, lat,lng)
- `limit` (optional, default 10)

Response:
```
{
  "trending_products": [],
  "recommended_products": [],
  "popular_shops": [],
  "recently_viewed": [],
  "flash_deals": []
}
```

### 2) Product Recommendations
`GET /recommendations/product/:id`

Query params:
- `user_id` (optional)
- `limit` (optional)

Response:
```
{
  "similar_products": [],
  "customers_also_bought": [],
  "more_from_this_shop": []
}
```

### 3) Shop Recommendations
`GET /recommendations/shop/:id`

Query params:
- `user_id` (optional)
- `location` (optional, lat,lng)
- `limit` (optional)

Response:
```
{
  "nearby_popular_shops": [],
  "top_rated_shops": []
}
```

### 4) Trending Products
`GET /recommendations/trending`

Query params:
- `window` (optional: `24h`, `7d`, `30d`)
- `limit` (optional)

Response:
```
{
  "trending_products": []
}
```

---

## Ranking Rules (Phase 1)

Each candidate gets a score:

```
score = (w1 * orders) + (w2 * views) + (w3 * cart_adds) + (w4 * wishlist)
```

Optional boosts:
- In-stock boost
- Price band match
- Shop rating boost

---

## Cache Strategy

- Key examples:
  - `rec:home:{userId}`
  - `rec:product:{productId}`
  - `rec:shop:{shopId}`
  - `rec:trending:{window}`

- TTL suggestions:
  - Home: 10-30 minutes
  - Product recommendations: 30-60 minutes
  - Trending: 15-30 minutes

---

## Next Step
- Implement Recommendation Service endpoints.
- Create candidate generators + ranking module.
- Integrate analytics + catalog services.
- Add Redis cache.

---

If you want, I will now start coding the service + API endpoints.
