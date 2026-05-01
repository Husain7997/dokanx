# DokanX Staging Rollout Runbook

Use this runbook for the first staging rollout after the scaling hardening work.

## 1. Apply Order

Run from the repository root:

```bash
kubectl apply -f infrastructure/kubernetes/namespace.yml
kubectl apply -f infrastructure/kubernetes/mongodb.yml
kubectl apply -f infrastructure/kubernetes/redis.yml
kubectl apply -f infrastructure/kubernetes/backend.yml
kubectl apply -f infrastructure/kubernetes/backend-workers.yml
kubectl apply -f infrastructure/kubernetes/storefront.yml
kubectl apply -f infrastructure/kubernetes/merchant-dashboard.yml
kubectl apply -f infrastructure/kubernetes/admin-panel.yml
kubectl apply -f infrastructure/kubernetes/developer-portal.yml
kubectl apply -f infrastructure/kubernetes/workload-policies.yml
kubectl apply -f infrastructure/kubernetes/prometheus-config.yml
kubectl apply -f infrastructure/kubernetes/prometheus.yml
kubectl apply -f infrastructure/kubernetes/grafana-config.yml
kubectl apply -f infrastructure/kubernetes/grafana.yml
kubectl apply -f infrastructure/kubernetes/loki-config.yml
kubectl apply -f infrastructure/kubernetes/loki.yml
kubectl apply -f infrastructure/kubernetes/promtail-config.yml
kubectl apply -f infrastructure/kubernetes/promtail.yml
kubectl apply -f infrastructure/kubernetes/ingress.yml
```

Or use:

```bash
bash scripts/deploy-k8s.sh
```

Windows verification shortcut:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-scaling-baseline.ps1
```

With explicit kubeconfig and context:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-scaling-baseline.ps1 `
  -Kubeconfig C:\path\to\kubeconfig `
  -ContextName your-context-name
```

## 2. Readiness Checks

```bash
kubectl get pods -n dokanx
kubectl get hpa,pdb -n dokanx
kubectl get svc -n dokanx
kubectl logs deployment/dokanx-backend-worker -n dokanx --tail=100
kubectl logs deployment/dokanx-backend-scheduler -n dokanx --tail=100
```

## 3. Endpoint Checks

```bash
curl -f https://api.dokanx.com/health
curl -f https://api.dokanx.com/health/readiness
curl -f "https://api.dokanx.com/metrics?format=prometheus"
curl -f https://api.dokanx.com/api/admin/metrics
```

On Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-scaling-baseline.ps1 -SkipKubernetes
```

If public DNS is not reachable yet, point to a staging or internal API base URL:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-scaling-baseline.ps1 `
  -ApiBaseUrl http://staging-api.internal:3001
```

## 4. Smoke Baseline

```bash
npm run test:load:smoke
```

Record:

1. browse/search p95 and p99
2. queue waiting counts
3. queue oldest waiting lag
4. outbox lag
5. Mongo primary and replica pressure

## 5. Mixed Baseline

```bash
BASE_URL=https://api.dokanx.com \
ORDER_TOKEN=your_customer_token \
PAYMENT_TOKEN=your_customer_token \
SHOP_ID=your_shop_id \
PRODUCT_ID=your_product_id \
npm run test:load:mixed
```

Add `ORDER_ID=...` only if you are testing payment-init replay on an existing order path.

## 6. Post-Run Review

1. Did `dokanx_queue_oldest_waiting_ms` recover within a few minutes?
2. Did `dokanx_outbox_oldest_pending_lag_ms` recover within a few minutes?
3. Did worker pods drain backlog without restart loops?
4. Did web latency stay high even when queue lag stayed low?
5. Did Mongo primary stay hotter than replicas?

## 7. Tuning Decision

1. High web latency, low queue lag:
   tune backend replicas or CPU requests.

2. Healthy web latency, high queue lag:
   tune worker replicas or worker CPU requests.

3. High outbox lag, low worker CPU:
   inspect event handlers and Mongo/Redis latency.

4. High primary pressure, lower replica pressure:
   continue read-routing rollout.
