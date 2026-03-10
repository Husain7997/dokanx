# Phase 7 Migration Notes (Supplier Marketplace Step 2 - Write Path)

## Date
- 2026-03-10

## Scope
- Added tenant-safe write APIs for supplier offers and bulk order requests.
- Added idempotent bulk order request creation.
- Added audit event emission for all new write endpoints.
- No financial ledger, wallet, settlement, payout, or inventory reservation mutation added.

## New/Updated APIs
- `POST /suppliers/:supplierId/offers`
- `PUT /suppliers/:supplierId/offers/:offerId`
- `POST /suppliers/bulk-orders`

## Security and Safety
- All write APIs are protected by:
  - `protect`
  - `tenantGuard`
  - RBAC
- Supplier offer write access requires supplier ownership by tenant (`supplier.createdByShop` matches `req.shop._id`).
- Bulk order requests are idempotent using `(shopId, idempotencyKey)` unique sparse index.

## Audit Events
- `SUPPLIER_OFFER_CREATED`
- `SUPPLIER_OFFER_UPDATED`
- `SUPPLIER_BULK_ORDER_REQUEST_CREATED`

## Index Notes
- Existing model indexes are used.
- `BulkOrderRequest` idempotency index already in model:
  - `{ shopId: 1, idempotencyKey: 1 }`, unique + sparse.
- No destructive index migration required.

## Rollout Plan
1. Deploy backend changes.
2. Seed suppliers with `createdByShop` for offer write authorization.
3. Verify write APIs with Postman and tenant role matrix.
4. Verify idempotency replay by repeating bulk order request with same key.

## Rollback
- Revert supplier marketplace module write-path code and route bindings.
- No schema rollback required.
