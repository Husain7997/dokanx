# DokanX Scaling Bottleneck Report

## Current Findings

1. Search endpoints were doing write-side telemetry inside the response path.
   Impact: higher p95 latency on hot catalog traffic.
   Action taken: telemetry and reindex work moved to queues.

2. Public catalog and shop reads had no shared versioned cache abstraction.
   Impact: repeated DB pressure on popular endpoints.
   Action taken: read-through versioned cache added for products, reviews, public shops, and search families.

3. Web pods were also running worker and scheduler responsibilities.
   Impact: API latency could degrade during background spikes.
   Action taken: worker and scheduler processes separated from web deployment.

4. Checkout, payment, and order protections were uneven.
   Impact: duplicate retries and race windows could still create inconsistent pressure.
   Action taken: stronger API idempotency behavior added, checkout route protected, and worker post-processing made idempotent.

5. Settlement queue payload usage was inconsistent across call sites.
   Impact: malformed background work could accumulate silently.
   Action taken: settlement worker now skips malformed jobs instead of executing invalid settlement logic.

## Remaining Gaps

1. Many reads still use primary-favored queries.
   Next: expand read-preference helper rollout to dashboard, wallet, analytics, admin, and customer lists.

2. Payment initiation still performs gateway I/O in the request path.
   Next: add payment-session cache and optional async fallback for provider slowness.

3. Outbox and inventory projection still rely on interval polling.
   Next: move outbox draining to dedicated queue workers with lag metrics.

4. Queue lag and dead-letter visibility are not surfaced in a single operational dashboard.
   Next: add queue depth, processing latency, and DLQ alert panels.

5. No repo-native load profile existed.
   Action taken: k6 smoke file added.
   Next: add checkout-heavy, payment-webhook-heavy, and mixed-tenant scenarios with result baselines.

## Suggested Measurement Order

1. Product list and search p95/p99 before and after cache.
2. Order create p95 and duplicate retry behavior.
3. Payment webhook throughput and duplicate webhook safety.
4. Queue lag under mixed browse and checkout load.
5. Mongo primary CPU versus replica CPU after read split rollout.
