# Phase 8 Migration Notes (AI Business Insights Step 1)

## Date
- 2026-03-10

## Scope
- Added read-only AI business insights endpoint for merchant tenants.
- Provides top-selling products and stockout-risk estimate based on recent sales velocity.
- No financial write operations.
- No inventory mutation or reservation hooks.

## New API
- `GET /insights/business`
  - Query:
    - `days` (1-90, default 7)
    - `limit` (1-20, default 5)

## Security
- Protected by:
  - `protect`
  - `tenantGuard`
  - `allowRoles("OWNER", "ADMIN", "STAFF")`

## Response Highlights
- `summary.primaryInsight`
- `topProducts[]`
- `stockRisk[]` with `estimatedStockoutDays`

## Index Notes
- Uses existing `Order` and `Product` indexes.
- Optional future index after profiling:
  - `Order`: `{ shopId: 1, status: 1, createdAt: -1 }`

## Rollout Plan
1. Deploy backend.
2. Validate insight quality on sample tenants.
3. Monitor query latency and aggregation load.
4. Iterate scoring rules with business feedback.

## Rollback
- Revert ai-insights module and route mount.
- No schema migration rollback needed.
