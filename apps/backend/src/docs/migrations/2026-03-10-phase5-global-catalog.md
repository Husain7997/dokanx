# Phase 5 Migration Notes (Global Product Catalog)

## Date
- 2026-03-10

## Scope
- Added Phase 5 catalog intelligence layer and global-product write API.
- No financial ledger schema or settlement logic changes.
- No inventory reservation engine changes.

## Backend Changes
- New endpoint: `POST /catalog/global-product`
- Improved endpoint: `GET /catalog/search` ranked search and validation.
- Existing endpoint hardened: `POST /catalog/import` (validation + audit logging).

## New Files
- `src/modules/catalog/deduplication.engine.js`
- `src/modules/catalog/catalogSearch.service.js`
- `src/test/catalog.phase5.unit.test.js`
- `postman/dokanx.phase5.catalog.collection.json`

## Data/Index Notes
- Existing indexes on `CatalogGlobalProduct` remain valid.
- Recommended next migration after data cleanup:
  - Add sparse unique index on `barcode` to enforce stronger global dedupe.
  - Example:
    - `db.catalogglobalproducts.createIndex({ barcode: 1 }, { unique: true, sparse: true, name: "uniq_catalog_barcode" })`
- Run duplicate barcode audit before enabling unique index.

## Rollout Plan
1. Deploy API changes.
2. Monitor `/catalog/search` latency and response quality.
3. Monitor dedupe match ratio for `POST /catalog/global-product`.
4. After stable period, run barcode duplicate audit and evaluate unique index migration.

## Rollback
- Revert module files changed in `src/modules/catalog/`.
- Keep existing catalog model unchanged; no destructive migration required.
