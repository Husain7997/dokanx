# Phase 8 Step 6: Assistant Contact Request Write-Path (2026-03-11)

## Scope
- Added safe write-path for merchant assistant contact escalation.
- Supports idempotent create + tenant-scoped list.
- Audit log is recorded for each create operation.

## API
- `POST /assistant/contact-requests`
  - Header: `Idempotency-Key` (optional, recommended)
  - Body:
    - `message` (required)
    - `targetRole` (`ADMIN`|`STAFF`|`SUPPORT`)
    - `channel` (`WHATSAPP`|`VOICE`)
    - `priority` (`LOW`|`MEDIUM`|`HIGH`)
    - `sourceIntent` (`CONTACT_SUPPORT`|`MANUAL`)
    - `callbackPhone` (optional)
- `GET /assistant/contact-requests`
  - Query:
    - `status` (`QUEUED`|`IN_PROGRESS`|`RESOLVED`|`CANCELLED`)
    - `targetRole`
    - `limit` (1-200)

## Data Model
- New model: `ContactRequest`
- Unique index: `{ shopId, idempotencyKey }` (sparse)
- Read indexes:
  - `{ shopId, status, createdAt }`
  - `{ shopId, targetRole, createdAt }`

## Safety
- No changes to ledger/wallet/payout/order/inventory write logic.
- Tenant isolation enforced by `shopId`.
