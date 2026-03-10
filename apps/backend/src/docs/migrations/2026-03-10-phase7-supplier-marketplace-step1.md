# Phase 7 Migration Notes (Supplier Marketplace Step 1)

## Date
- 2026-03-10

## Scope
- Introduced supplier marketplace foundational models.
- Added read-only supplier discovery APIs.
- No changes to financial ledger, wallet, settlement, payout, checkout, or inventory reservation flows.

## New Models
- `Supplier`
- `SupplierOffer`
- `SupplierRating`
- `BulkOrderRequest` (for future write workflow)

## New APIs
- `GET /suppliers/search`
- `GET /suppliers/:supplierId/offers`

## Route Registration
- Mounted supplier marketplace routes in main router:
  - `router.use("/suppliers", supplierMarketplaceRoutes)`

## Index Notes
- `Supplier`: text search + geo index + category/rating index.
- `SupplierOffer`: supplier-active composite index + category/brand/price index + text index.
- `SupplierRating`: unique `(supplierId, shopId)`.
- `BulkOrderRequest`: unique sparse `(shopId, idempotencyKey)` for safe writes in next step.

## Rollout Plan
1. Deploy backend changes.
2. Seed sample suppliers/offers in staging.
3. Verify tenant-protected access with OWNER/ADMIN/STAFF roles.
4. Validate ranking relevance and latency.

## Rollback
- Revert new supplier marketplace module files and route registration.
- No destructive DB migration included in this step.
