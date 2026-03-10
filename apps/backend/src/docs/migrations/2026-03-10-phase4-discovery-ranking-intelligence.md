# Phase 4 Migration Notes (Discovery Ranking Intelligence)

## Date
- 2026-03-10

## Scope
- Enhanced discovery product search with new filters and sorting options.
- No financial, wallet, settlement, payout, or inventory mutation logic changed.

## Changes
- `GET /search/products` now supports:
  - `category`
  - `minStock`
  - `maxPrice`
  - `sortBy` (`relevance`, `price_asc`, `distance_asc`)
- Added query validation for new fields.
- Added ranking utility unit tests.

## Affected Files
- `src/modules/discovery/discovery.service.js`
- `src/modules/discovery/discovery.controller.js`
- `src/modules/discovery/discovery.validator.js`
- `src/test/discovery.ranking.unit.test.js`
- `src/test/platform.validation.test.js`
- `postman/dokanx.phase4.discovery-ranking.collection.json`

## Index Notes
- Existing product indexes remain in use.
- Optional future optimization:
  - Compound index for discovery-heavy queries: `{ isActive: 1, category: 1, stock: -1, price: 1 }`
  - Add after profiling in production traffic.

## Rollout Plan
1. Deploy backend.
2. Validate old queries still work (backward compatibility).
3. Validate new filters and sort modes through Postman collection.
4. Monitor search latency and top query patterns.

## Rollback
- Revert discovery module files listed above.
- No schema migration rollback required.
