# Phase 10 Step 2: Ads Connectors Scaffold (2026-03-11)

## Scope
- Added connector abstraction for ad platforms:
  - Facebook
  - Google
  - YouTube
- This step is scaffold-only (no external API calls yet).

## Files
- `src/modules/ads/connectors/base.connector.js`
- `src/modules/ads/connectors/facebook.connector.js`
- `src/modules/ads/connectors/google.connector.js`
- `src/modules/ads/connectors/youtube.connector.js`
- `src/modules/ads/connectors/index.js`

## Purpose
- Prepare clean extension point for platform publish/sync worker.
- Keep controller/service decoupled from provider-specific SDK logic.
