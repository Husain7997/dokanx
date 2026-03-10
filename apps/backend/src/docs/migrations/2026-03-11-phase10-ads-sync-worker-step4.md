# Phase 10 Step 4: Ads Queue Sync Worker Hook (2026-03-11)

## Scope
- Wired analytics/event pipeline worker to process ad sync tasks with retry.
- Added async task queue model for campaign-platform sync attempts.
- Added outbox trace events for sync requests.

## Implementation
- `src/analytics/eventPipeline.worker.js`
  - Runs `runSyncTaskBatch()` every 15 seconds.
- `src/modules/ads/adsCampaign.service.js`
  - Added sync-task lifecycle with exponential backoff retry.
  - Added outbox trace on queueing (`ads.campaign.sync.requested`).
  - Updates campaign status from task aggregate:
    - all synced => `ACTIVE`
    - no pending + at least one failed => `FAILED`

## Model Added
- `src/modules/ads/models/adsSyncTask.model.js`

## Safety
- No wallet/ledger/settlement/inventory mutation.
- Only ad campaign state transitions are performed.
- External platform calls are still connector-scaffolded.
