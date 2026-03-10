# Code Hygiene & Structure Cleanup (2026-03-11)

## Scope
- Removed duplicate/unused audit utility file.
- Removed dead helper export from audit model.
- Normalized ads module folder structure to keep models inside `models/`.

## Changes
- Deleted: `src/utils/createAudit.js` (unused duplicate)
- Updated: `src/models/audit.model.js`
  - Removed unreachable `exports.createAudit` block that referenced undefined `Audit`
- Updated: `src/models/AuditLog.js`
  - Re-exported from `src/models/audit.model.js` to avoid schema duplication/drift
- Moved:
  - `src/modules/ads/adsCampaign.model.js`
  - to `src/modules/ads/models/adsCampaign.model.js`
- Updated imports:
  - `src/modules/ads/adsCampaign.service.js`
  - `src/test/adsCampaign.unit.test.js`

## Safety
- No business logic changes in finance, inventory, settlement, or wallet flows.
- Refactor is path/cleanup only.
