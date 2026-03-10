# Phase 7 Migration Notes (Supplier Order Lifecycle Step 3)

## Date
- 2026-03-10

## Scope
- Added read-only lifecycle status transitions for supplier bulk orders.
- Added bulk order listing API for buyer/seller scoped views.
- No inventory reservation or stock mutation included in this step.
- No financial ledger mutations included in this step.

## New APIs
- `GET /suppliers/bulk-orders`
- `PATCH /suppliers/bulk-orders/:orderId/status`

## Lifecycle Rules
- `PENDING -> ACCEPTED` (seller only)
- `PENDING -> REJECTED` (seller only)
- `PENDING -> CANCELLED` (buyer only)
- `ACCEPTED -> FULFILLED` (seller only)
- Terminal statuses (`REJECTED`, `CANCELLED`, `FULFILLED`) cannot transition further.

## Audit Events
- `SUPPLIER_BULK_ORDER_ACCEPTED`
- `SUPPLIER_BULK_ORDER_REJECTED`
- `SUPPLIER_BULK_ORDER_FULFILLED`
- `SUPPLIER_BULK_ORDER_CANCELLED`

## Schema / Index Changes
- `BulkOrderRequest` now includes:
  - `statusHistory[]`
  - `acceptedAt`, `rejectedAt`, `cancelledAt`, `fulfilledAt`
- Added indexes:
  - `{ shopId: 1, status: 1, createdAt: -1 }`
  - `{ supplierId: 1, status: 1, createdAt: -1 }`

## Rollout Plan
1. Deploy backend changes.
2. Validate buyer and seller scope access on listing endpoint.
3. Validate lifecycle transition rules in staging.
4. Ensure audit records are generated for each transition.

## Rollback
- Revert supplier marketplace lifecycle code and routes.
- Optional fields added to MongoDB documents are backward compatible; no destructive rollback needed.
