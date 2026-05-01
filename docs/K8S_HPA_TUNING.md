# DokanX Kubernetes HPA Tuning

This guide is for the first production scaling passes after queue and outbox observability are enabled.

## Current Intent

1. `dokanx-backend`
   Scale on CPU and memory, but avoid rapid scale-down during short-lived bursts.

2. `dokanx-backend-worker`
   Scale faster than web because queue lag recovery matters more than raw request concurrency once traffic is already accepted.

3. `dokanx-backend-scheduler`
   Keep singleton and protected with a disruption budget.

## Applied Defaults

1. Backend HPA can grow by up to `100%` or `4 pods` per minute.
2. Worker HPA can grow by up to `100%` or `3 pods` per minute.
3. Backend scale-down waits `300s`.
4. Worker scale-down waits `600s`.
5. Frontend/admin scale-down waits `300s`.

## Why These Numbers

1. Web pods should expand quickly, but not thrash on every brief spike.
2. Worker pods usually need longer cool-down because queue drains keep running after request spikes end.
3. Scheduler must stay stable; scaling is not useful there.

## Tuning Using Live Metrics

Use these signals together:

1. `dokanx_queue_jobs{state="waiting"}`
2. `dokanx_queue_oldest_waiting_ms`
3. `dokanx_outbox_pending`
4. `dokanx_outbox_oldest_pending_lag_ms`
5. pod CPU and memory
6. Mongo primary CPU and replica CPU

## Adjustment Rules

1. If web CPU is high and queue lag stays low:
   increase backend `maxReplicas` before touching worker HPA.

2. If queue waiting and oldest waiting lag rise while web latency stays acceptable:
   increase worker `maxReplicas` or worker CPU request.

3. If worker CPU is low but queue lag is high:
   investigate slow handlers, Redis latency, or Mongo contention before raising replicas.

4. If pods oscillate up and down every few minutes:
   increase `scaleDown.stabilizationWindowSeconds`.

5. If traffic surges outrun HPA response:
   increase `scaleUp` pod policy or raise `minReplicas` during peak business windows.

## Safe Rollout Order

1. Run browse/search smoke.
2. Run mixed load with order and payment enabled.
3. Record queue lag and outbox lag for 15 minutes after peak.
4. Tune worker HPA first if backlog persists.
5. Tune backend HPA second if request latency remains high.

## Practical Starting Alerts

1. Worker review needed when `dokanx_queue_oldest_waiting_ms > 300000`.
2. Outbox review needed when `dokanx_outbox_oldest_pending_lag_ms > 300000`.
3. Web review needed when mixed-flow `p95 > 1800ms`.

## Validation Checklist

1. `kubectl describe hpa -n dokanx`
2. `kubectl top pods -n dokanx`
3. `kubectl get pdb -n dokanx`
4. Grafana queue/outbox dashboard
5. `/metrics?format=prometheus` returns non-empty queue series
