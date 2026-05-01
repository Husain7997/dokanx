# DokanX Load Testing

## Smoke Profile

Use the k6 script:

`tests/load/k6-dokanx-smoke.js`

## Example

```powershell
k6 run `
  -e BASE_URL=http://127.0.0.1:5001 `
  -e ORDER_TOKEN=your_jwt `
  -e SHOP_ID=your_shop_id `
  tests/load/k6-dokanx-smoke.js
```

## Mixed Flow Example

```powershell
k6 run `
  -e BASE_URL=http://127.0.0.1:5001 `
  -e ORDER_TOKEN=customer_jwt `
  -e PAYMENT_TOKEN=customer_jwt `
  -e SHOP_ID=your_shop_id `
  -e PRODUCT_ID=your_product_id `
  -e ORDER_ID=existing_order_id `
  -e ENABLE_ORDER_FLOW=true `
  -e ENABLE_PAYMENT_FLOW=true `
  -e SEARCH_TERM=rice `
  tests/load/k6-dokanx-smoke.js
```

## Recommended Progression

1. Run browse-only profile and capture p50, p95, p99.
2. Run search profile and inspect queue lag for `search-log-*`.
3. Run order placement with one tenant.
4. Run mixed tenants to detect hot-partition issues.
5. Run payment initiate and webhook replay tests.

## Suggested Run Order

1. Start backend web process with workers disabled.
   `npm run start:backend`
2. Start worker process separately.
   `npm --prefix apps/backend run start:workers`
3. Open admin metrics endpoint and keep it visible during the run.
   `/api/admin/metrics`
4. Run the browse and search smoke first.
5. Only after stable browse/search numbers, add order and payment scenarios.
6. Turn on `ENABLE_ORDER_FLOW=true` before payment flow so queue lag growth is easier to attribute.
7. Keep `ORDER_ID` fixed only for payment-init replay checks; use fresh orders for true checkout capacity tests.

## Operational Checks During Run

1. `outbox.pending` should not grow forever.
2. `outbox.oldestPendingLagMs` should recover after bursts.
3. `queues.analytics.counts.waiting` should spike and then drain.
4. `queues.payments.counts.waiting` should stay near zero under browse-only load.
5. Replica-backed read endpoints should reduce primary pressure compared with earlier runs.
6. Fraud/admin overview endpoints should not materially raise primary CPU after read-routing rollout.
7. If payment flow is enabled, `queues.payments.oldestWaitingMs` should return near baseline within a few minutes.

## What To Record

1. API latency: p50, p95, p99.
2. Error rate by endpoint.
3. Mongo primary CPU and replica CPU.
4. Redis ops/sec and memory.
5. Queue depth, processing delay, and dead-letter growth.
6. `outbox.inFlight` and `outbox.errored` before peak, at peak, and 5 minutes after peak.

## Endpoint Mix

1. `browse_products`: cache-heavy storefront reads.
2. `search_catalog`: read + analytics queue fanout.
3. `place_orders`: transactional write path with idempotency and post-create queue load.
4. `initiate_payments`: payment queue and fraud-adjacent pressure.

## Admin Metrics Snapshot

Capture `/metrics` from the admin metrics routes before, during, and after the run:

`GET /api/admin/metrics`

For Prometheus scraping and raw text verification:

`GET /metrics?format=prometheus`

The most useful fields for first-response triage are:

1. `queues.*.counts.waiting`
2. `queues.*.counts.active`
3. `queues.*.oldestWaitingMs`
4. `outbox.pending`
5. `outbox.inFlight`
6. `outbox.errored`
7. `outbox.oldestPendingLagMs`

## Monitoring Alignment

1. Prometheus is configured to scrape backend metrics from `/metrics?format=prometheus`.
2. Grafana dashboard `DokanX Platform Overview` now focuses on queue backlog, oldest queue lag, and outbox health.
3. If the dashboard is blank, test the raw scrape endpoint first before changing alert rules.

## Shortcut Scripts

1. `npm run test:load:smoke`
2. `npm run test:load:mixed`

`test:load:mixed` enables order and payment scenarios, but you still need to provide `BASE_URL`, auth tokens, shop/product identifiers, and optionally `ORDER_ID`.
