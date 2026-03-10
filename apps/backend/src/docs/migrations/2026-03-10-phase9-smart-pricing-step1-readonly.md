# Phase 9 Migration Notes (Smart Pricing Step 1 - Read-Only)

## Date
- 2026-03-10

## Scope
- Added read-only pricing recommendation endpoint.
- Uses recent sales velocity and stock coverage to suggest advisory price adjustments.
- No direct product price mutation.
- No financial ledger mutation.

## New API
- `GET /insights/pricing/recommendations`
  - Query:
    - `days` (1-90)
    - `limit` (1-20)
    - `maxAdjustmentPct` (1-30)

## Output
- `recommendations[]`
  - `productName`
  - `currentPrice`
  - `suggestedPrice`
  - `adjustmentPct`
  - `reason`
  - `confidence`

## Safety Notes
- Advisory only; no automatic price update.
- Tenant-scoped via existing auth + tenant guard.

## Rollout Plan
1. Deploy backend.
2. Verify recommendation quality in staging.
3. Collect merchant feedback before enabling write-back pricing workflows.

## Rollback
- Revert ai-insights pricing endpoint changes and Postman collection.
- No DB rollback needed.
