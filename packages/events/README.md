# DokanX Event Bus

Canonical event bus package for monorepo organization.

Current backend implementations already exist in:
- `apps/backend/src/system/singletons/eventBus.js`
- `apps/backend/src/platform/events`
- `apps/backend/src/infrastructure/events`
- `apps/backend/src/domain/events.js`

Standardized domain events for cross-service reactions:
- `order.created`
- `order.shipped`
- `payment.received`
- `inventory.updated`
- `coupon.used`
- `review.created`

The package is additive documentation and contract scaffolding only in this step.
