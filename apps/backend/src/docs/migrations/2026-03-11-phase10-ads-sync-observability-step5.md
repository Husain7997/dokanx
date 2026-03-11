# Phase 10 Ads - Sync Observability (Step 5)

Date: 2026-03-11

## What changed

- Added read-only sync observability endpoint for ad campaigns:
  - `GET /api/ads/campaigns/:campaignId/sync-status`
- Added service method `getCampaignSyncStatus` to expose:
  - campaign status
  - per-platform sync status and external campaign id
  - related sync task state (`attempts`, `maxAttempts`, `nextRetryAt`, `lastError`)
  - summary counts (`totalEnabled`, `synced`, `pending`, `failed`)

## Why

- Gives merchants/admin/staff safe visibility into async connector sync health.
- Reduces manual debugging for `QUEUED` campaigns.
- No financial, inventory, or settlement path changes.

## Backward compatibility

- Fully backward compatible.
- Existing endpoints and write paths are unchanged.

## Security and tenant safety

- Endpoint remains behind `protect + tenantGuard`.
- Role access: `OWNER`, `ADMIN`, `STAFF`.
- Query is scoped by `shopId` and `campaignId`.

## Test coverage

- Added unit test for sync-status summary in:
  - `src/test/adsCampaign.unit.test.js`
