# Phase 9 Step 2: Margin-Aware Pricing Advisory (2026-03-10)

## Scope
- Added read-only margin-aware pricing advisory endpoint.
- Uses cost signal (supplier wholesale), competitor price benchmark, and demand trend proxy.
- No write-path updates to orders, inventory, wallet, or ledger.

## API
- `GET /insights/pricing/margin-advisory`
  - Query:
    - `days` (7-120)
    - `limit` (1-30)
    - `targetMarginPct` (5-60)
    - `maxAdjustmentPct` (1-30)

## Notes
- Cost signal source: active supplier offers matched by barcode/brand/category/name.
- Competitor signal source: other tenant product prices (read-only benchmark).
- Elasticity proxy: period-over-period demand trend.

## Postman
- `postman/dokanx.phase9.margin-aware-pricing.collection.json`
