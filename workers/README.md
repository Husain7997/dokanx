# Worker System

Existing async execution lives in `apps/backend/src/workers`, `apps/backend/src/jobs`, and `apps/backend/src/platform/queue`.

Canonical worker domains:
- settlement-worker
- courier-status-worker
- webhook-delivery-worker
- automation-trigger-worker
- analytics aggregation

All worker expansions should remain queue-driven to preserve financial and POS write ordering.
