# Phase 10 Step 3: Ads Intelligence + Governance Extensions (2026-03-11)

## Scope
Implemented safe modular features for requested ads intelligence and controls:

- AI ad copy + banner suggestion (BN/EN)
- Audience recommendation (geo + purchase behavior)
- Product feed sync (catalog-based)
- Smart bidding recommendation (sales/leads goal)
- Coupon-coupled tracking fields + daily metric ingestion
- Daily spend guardrail + anomaly alert check
- Cross-channel frequency capping
- Merchant approval workflow (maker-checker launch)

## APIs Added
- `GET /ads/campaigns/:campaignId/ai-suggestion`
- `GET /ads/campaigns/:campaignId/audience-recommendation`
- `POST /ads/campaigns/:campaignId/feed/sync`
- `POST /ads/campaigns/:campaignId/metrics`
- `GET /ads/campaigns/:campaignId/bidding/recommendation`
- `GET /ads/campaigns/:campaignId/guardrail/check`
- `PUT /ads/campaigns/:campaignId/frequency-cap`
- `POST /ads/campaigns/:campaignId/approval/request`
- `POST /ads/campaigns/:campaignId/approval/approve`
- `POST /ads/campaigns/:campaignId/approval/reject`

## Models Added
- `AdsCampaignMetric`
- `AdsCampaignApproval`

## Model Extended
- `AdCampaign`
  - `smartBidding`
  - `couponTracking`
  - `feedSync`
  - `guardrail`
  - `audience.frequencyCapPerUserPerDay`

## Safety Notes
- All operations are tenant-scoped by `shopId`.
- Approval enforces maker-checker separation (same user cannot approve own request).
- No changes to financial ledger, settlement, or inventory write-path.
