# Phase 8 Migration Notes (AI Business Insights Step 3 - Trends)

## Date
- 2026-03-10

## Scope
- Added trend comparison insights endpoint.
- Compares current period vs previous equal-length period for order count, revenue, and sold quantity.
- Produces top moving products by sold quantity change percent.
- Read-only; no financial or inventory write operations.

## New API
- `GET /insights/business/trends`
  - Query:
    - `days` (1-90)
    - `limit` (1-20)

## Response Highlights
- `current` metrics
- `previous` metrics
- `trendSummary` (`orderCountChangePct`, `revenueChangePct`, `soldQtyChangePct`)
- `topMovers[]`

## Security
- Existing protections remain:
  - `protect`
  - `tenantGuard`
  - `allowRoles("OWNER", "ADMIN", "STAFF")`

## Rollout Plan
1. Deploy backend.
2. Validate trend outputs with known sales windows in staging.
3. Monitor aggregation latency.

## Rollback
- Revert ai-insights step3 service/controller/route changes and Postman collection.
- No DB rollback needed.
