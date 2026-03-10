# Phase 8 Step 5: Bengali WhatsApp/Voice Merchant Assistant (2026-03-10)

## Scope
- Added read-only merchant operations assistant endpoint.
- Supports Bangla/English intent detection for quick operational queries.
- No write operation on finance, inventory, order state, or credit ledger.

## API
- `POST /assistant/ops/query`
  - Body:
    - `message` (required, max 500 chars)
    - `channel` (`WHATSAPP` or `VOICE`)

## Supported Intents
- Today sales
- Low stock list
- Pending orders
- Top product (7 days)
- Payout status (30 days)
- Risk alerts
- Admin/staff contact request (queued draft only)

## Safe Contact Draft
- Intent returns `mode: QUEUED_DRAFT` payload for ticket/callback creation by next write-path phase.
- No support ticket, order, inventory, or financial data mutation in this step.

## Postman
- `postman/dokanx.phase8.whatsapp-voice-assistant.collection.json`
