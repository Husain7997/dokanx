# Phase 10 Step 1: Multi-Platform Product Ads Campaign Module (2026-03-11)

## Scope
- Added tenant-safe ad campaign management for Facebook, Google, and YouTube.
- Supports create/list/get/update/status lifecycle.
- External ad network API calls are intentionally not included in this safe step.

## API
- `POST /ads/campaigns`
- `GET /ads/campaigns`
- `GET /ads/campaigns/:campaignId`
- `PUT /ads/campaigns/:campaignId`
- `PATCH /ads/campaigns/:campaignId/status`

## Safety
- Tenant isolation: all reads/writes scoped by `shopId`.
- Idempotency: create supports `Idempotency-Key` with unique index.
- Audit logs:
  - `AD_CAMPAIGN_CREATED`
  - `AD_CAMPAIGN_UPDATED`
  - `AD_CAMPAIGN_STATUS_UPDATED`
- No wallet/ledger/inventory/order mutation.

## Model
- `AdCampaign`
  - Objective, budget, audience, creative, product mapping
  - Per-platform config and sync fields
  - Lifecycle status history

## Postman
- `postman/dokanx.phase10.ads-campaigns.collection.json`
