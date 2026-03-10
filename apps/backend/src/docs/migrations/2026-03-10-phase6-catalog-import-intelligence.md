# Phase 6 Migration Notes (Catalog Import Intelligence)

## Date
- 2026-03-10

## Scope
- Improved Excel distributor import pipeline.
- Added row intelligence and error reporting.
- No changes to ledger, wallet, settlement, payout, or inventory reservation logic.

## Backend Changes
- Auto-detect brand/category when Excel columns are missing.
- Detect duplicate rows inside a single uploaded file.
- Confirm endpoint now returns idempotency replay metadata.
- New endpoint: `GET /catalog/import-excel/errors/:batchId`

## Affected Files
- `src/modules/catalog-import/catalogImport.service.js`
- `src/modules/catalog-import/catalogImport.controller.js`
- `src/modules/catalog-import/catalogImport.routes.js`
- `src/test/catalogImport.phase6.unit.test.js`
- `postman/dokanx.phase6.catalog-import.collection.json`

## API Behavior Changes
- `POST /catalog/import-excel/confirm/:batchId`
  - Response now includes:
    - `idempotencyReplay` (boolean)
    - `replayedFromBatchId` (string|null)
- `GET /catalog/import-excel/errors/:batchId`
  - Returns invalid rows with row numbers and error list.

## Data/Index Notes
- Existing `ProductImportBatch` index remains unchanged:
  - `{ shopId: 1, idempotencyKey: 1 }` unique + sparse.
- No destructive migration required.

## Rollout Plan
1. Deploy backend.
2. Validate upload > preview > confirm flow in staging.
3. Verify idempotency replay behavior with repeated `Idempotency-Key`.
4. Verify error report endpoint on invalid Excel samples.

## Rollback
- Revert `catalog-import` module files listed above.
- No data rollback script needed.
