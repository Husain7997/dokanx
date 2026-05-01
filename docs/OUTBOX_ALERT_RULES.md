# DokanX Queue And Outbox Alert Rules

These thresholds are intentionally simple so the first production rollout can alert on obvious degradation without flooding the team.

## Queue Alerts

1. `analytics waiting backlog`
   Trigger when `queues.analytics.counts.waiting > 1000` for 10 minutes.
   Meaning: search logging or reindex fanout is not draining fast enough.

2. `payments waiting backlog`
   Trigger when `queues.payments.counts.waiting > 100` for 5 minutes.
   Meaning: payment side effects are slower than incoming payment success volume.

3. `queue oldest waiting lag`
   Trigger when any critical queue reports `oldestWaitingMs > 300000` for 5 minutes.
   Meaning: jobs are starving, not just briefly spiking.

4. `queue active but no drain`
   Trigger when `counts.active > 0` and `counts.completed` stays flat for 10 minutes.
   Meaning: workers may be stuck or repeatedly failing.

## Outbox Alerts

1. `outbox pending growth`
   Trigger when `outbox.pending > 500` for 10 minutes.
   Meaning: event dispatch is falling behind sustained write traffic.

2. `outbox stale lag`
   Trigger when `outbox.oldestPendingLagMs > 300000` for 5 minutes.
   Meaning: oldest undelivered event is older than 5 minutes.

3. `outbox in-flight saturation`
   Trigger when `outbox.inFlight > 100` for 10 minutes.
   Meaning: workers are claiming messages faster than they finish them.

4. `outbox errors present`
   Trigger when `outbox.errored > 0` for 5 minutes.
   Meaning: one or more events exhausted at least one processing attempt and need review.

## API Alerts

1. `p95 latency degraded`
   Trigger when browse or search `p95 > 1200ms` for 10 minutes.

2. `transaction latency degraded`
   Trigger when order or payment-init `p95 > 1800ms` for 10 minutes.

3. `error rate high`
   Trigger when `5xx rate > 2%` for 5 minutes.

## First Response Runbook

1. Check `GET /api/admin/metrics` and record queue and outbox lag.
2. Compare backend pod CPU/memory with worker pod CPU/memory.
3. If browse/search is healthy but queues lag, scale workers before scaling web pods.
4. If primary Mongo is saturated but replicas are healthy, move more read-heavy endpoints to read preference helpers.
5. If outbox lag grows with low worker CPU, inspect stuck handlers and retry/error records.
6. If payment queue is the hotspot, pause non-critical reindex or analytics jobs before touching checkout traffic.

## Tuning Notes

1. Start conservative; adjust thresholds after the first week of real traffic.
2. Alerts should page only on sustained lag, not bursty but self-healing spikes.
3. Keep payment and checkout alerts stricter than analytics alerts.
