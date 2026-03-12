# Phase 10 Migration Notes

## Customer Identity Tenant Scope

- Existing global `CustomerIdentity.phone` uniqueness must be replaced with compound uniqueness on:
  - `shopId`
  - `phone`
- Safe rollout:
  1. Backfill `shopId: null` on legacy rows where field is absent
  2. Drop legacy unique index on `phone`
  3. Create compound sparse unique index on `{ shopId: 1, phone: 1 }`
  4. Verify credit accounts still resolve customer references per tenant

## POS Offline Sync

- New collection: `possyncqueues`
- Required indexes:
  - `{ shopId: 1, terminalId: 1, clientMutationId: 1 }` unique
  - `{ shopId: 1, status: 1, createdAt: 1 }`
- Replay behavior:
  - create delivered guest order
  - create successful payment attempt with `orderChannel = POS`
  - create inventory mutations with `type = POS_SALE`
  - publish `POS_SYNC_COMPLETED` domain event

## Operational Safeguards

- Run migration before enabling tenant-scoped customer creation in production
- Monitor duplicate key violations on `CustomerIdentity` after rollout
- Replay POS queues in batches and inspect failed rows before retrying
