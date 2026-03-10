# Phase 7-8 Safe Step: Supplier Reliability + Demand-Aware Reorder (2026-03-10)

## Scope
- Added read-only supplier SLA/reliability scoreboard endpoint.
- Added read-only demand-aware reorder suggestion endpoint using supplier lead-time.
- No financial ledger, wallet, settlement, payout, or inventory mutation changes.

## API Additions
- `GET /suppliers/reliability/scoreboard`
  - Query: `q`, `category`, `area`, `lat`, `lng`, `radiusKm`, `days`, `limit`
- `GET /insights/reorder/suggestions`
  - Query: `days`, `limit`, `supplierCandidates`

## Validation Updates
- Supplier marketplace: `validateSupplierReliabilityQuery`
- AI insights: `supplierCandidates` in `validateBusinessInsightsQuery`

## Index Notes
Added read-optimized indexes on `BulkOrderRequest`:
- `{ shopId: 1, createdAt: -1 }`
- `{ supplierId: 1, createdAt: -1 }`

## Rollout Notes
1. Deploy backend API.
2. Ensure indexes are built on startup/migration window.
3. Verify endpoints with Postman collections:
   - `postman/dokanx.phase7.supplier-reliability.collection.json`
   - `postman/dokanx.phase8.reorder-suggestions.collection.json`
