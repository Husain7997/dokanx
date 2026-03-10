# Phase 8 Step 7: Assistant Contact Request Lifecycle (2026-03-11)

## Scope
- Added status lifecycle update endpoint for assistant contact requests.
- Added role-based transition guard and status history.
- No financial/inventory/order mutation introduced.

## API
- `PATCH /assistant/contact-requests/:requestId/status`
  - Body:
    - `status` (`IN_PROGRESS`|`RESOLVED`|`CANCELLED`)
    - `note` (optional)

## Role Policy
- `OWNER` / `ADMIN`:
  - Can transition according to lifecycle map.
- `STAFF`:
  - Can only set `IN_PROGRESS`.

## Lifecycle Rules
- `QUEUED -> IN_PROGRESS | CANCELLED`
- `IN_PROGRESS -> RESOLVED | CANCELLED`
- `RESOLVED` and `CANCELLED` are terminal.

## Data Model Updates
- `ContactRequest` new fields:
  - `inProgressAt`, `inProgressBy`
  - `resolvedAt`, `resolvedBy`
  - `cancelledAt`, `cancelledBy`
  - `statusHistory[]`

## Audit
- Action logged: `ASSISTANT_CONTACT_REQUEST_STATUS_UPDATED`
