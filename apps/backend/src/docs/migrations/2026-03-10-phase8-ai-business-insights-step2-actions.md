# Phase 8 Migration Notes (AI Business Insights Step 2 - Action Plan)

## Date
- 2026-03-10

## Scope
- Added actionable AI insights endpoint based on existing read-only signals.
- Generates prioritized recommendations from stockout risk and top-selling products.
- No financial write operations.
- No inventory mutation.

## New API
- `GET /insights/business/actions`
  - Query:
    - `days` (1-90)
    - `limit` (1-20)
    - `maxActions` (1-25)

## Output
- `summary.primaryAction`
- `actions[]` with:
  - `type` (`RESTOCK`, `PRICE_REVIEW`)
  - `priority`
  - `riskLevel`
  - `message`

## Security
- Existing protections remain:
  - `protect`
  - `tenantGuard`
  - `allowRoles("OWNER", "ADMIN", "STAFF")`

## Rollout Plan
1. Deploy backend.
2. Verify action relevance with staging shops.
3. Track API latency and action usefulness feedback.

## Rollback
- Revert ai-insights step2 code changes and Postman collection.
- No DB migration rollback needed.
