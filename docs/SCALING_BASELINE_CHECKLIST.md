# DokanX Scaling Baseline Checklist

Use this checklist before the first real mixed-load test and after every major infra change.

## 1. Apply Order

1. Deploy backend web pods.
2. Deploy backend worker pods.
3. Deploy backend scheduler pod.
4. Apply HPA and PDB policies.
5. Apply Prometheus and Grafana manifests.

## 2. Pre-Run Verification

1. `GET /health`
2. `GET /health/readiness`
3. `GET /metrics?format=prometheus`
4. `GET /api/admin/metrics`
5. Grafana dashboard loads queue and outbox panels.

## 3. Kubernetes Checks

1. `kubectl get deploy -n dokanx`
2. `kubectl get hpa -n dokanx`
3. `kubectl get pdb -n dokanx`
4. `kubectl top pods -n dokanx`
5. `kubectl logs deployment/dokanx-backend-worker -n dokanx --tail=100`

## 4. Smoke Run

1. Run `npm run test:load:smoke`
2. Watch queue waiting counts.
3. Watch outbox lag.
4. Confirm no sustained worker backlog.

## 5. Mixed Run

1. Run `npm run test:load:mixed`
2. Provide `BASE_URL`, `ORDER_TOKEN`, `PAYMENT_TOKEN`, `SHOP_ID`, `PRODUCT_ID`
3. Add `ORDER_ID` only when testing payment-init replay or a fixed order path
4. Record p95, p99, error rate, queue lag, outbox lag

## 6. Pass Criteria

1. Browse/search p95 stays within target
2. Order/payment p95 stays within target
3. `dokanx_queue_oldest_waiting_ms` returns to near-baseline after burst
4. `dokanx_outbox_oldest_pending_lag_ms` returns to near-baseline after burst
5. Worker pods drain backlog without repeated restarts

## 7. If It Fails

1. High web latency + low queue lag:
   tune backend replicas or CPU requests first

2. High queue lag + acceptable web latency:
   tune worker replicas or worker CPU requests first

3. High outbox lag + low worker CPU:
   inspect handlers, Redis latency, Mongo contention

4. High primary Mongo pressure + healthy replicas:
   move more reads to read-preference helpers
