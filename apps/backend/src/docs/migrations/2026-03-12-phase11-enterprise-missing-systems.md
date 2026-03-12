# Phase 11 Enterprise Missing Systems

## Added modules

- `src/modules/customer/customerSegmentation.*`
- `src/modules/gift-card/*`
- `src/modules/content/*`
- `src/modules/analytics-warehouse/*`
- `src/modules/courier/courierOptimization.*`
- `src/workers/analyticsWarehouse.worker.js`

## Safe integration notes

- No ledger, wallet, settlement, POS, or order lifecycle schema was altered.
- New modules are isolated and mounted through new route prefixes or additive courier routes.
- Analytics warehouse snapshots are read-only aggregates and should be built from read replicas in production.

## Index recommendations

- `customer_segments`: `{ shopId: 1, name: 1 }`
- `gift_cards`: `{ shopId: 1, code: 1 }`
- `cms_pages`: `{ shopId: 1, slug: 1 }`
- `seo_rules`: `{ shopId: 1, entityType: 1, entityRef: 1 }`
- `analytics_snapshots`: `{ shopId: 1, metricType: 1, dateKey: 1 }`
- `courier_optimization_profiles`: `{ shopId: 1 }`

## Rollout guidance

1. Enable new endpoints behind normal tenant authorization only.
2. Route analytics warehouse builds to a replica-backed execution path before scheduling.
3. If queue-based scheduling is added later, reuse the existing queue and worker registration path.
