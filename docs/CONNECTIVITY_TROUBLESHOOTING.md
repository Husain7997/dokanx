# DokanX Connectivity Troubleshooting

Use this when scaling verification is blocked before any real load test can start.

## Kubernetes Context Missing

Symptoms:

1. `kubectl config get-contexts` shows no rows
2. `kubectl config current-context` says current context is not set
3. baseline verifier warns that no reachable cluster context is configured

What to do:

1. Obtain a valid kubeconfig for staging or production
2. Set it for the current shell:

```powershell
$env:KUBECONFIG="C:\path\to\kubeconfig"
kubectl config get-contexts
kubectl config use-context your-context-name
```

3. Or pass it directly to the verifier:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-scaling-baseline.ps1 `
  -Kubeconfig C:\path\to\kubeconfig `
  -ContextName your-context-name
```

## API Host Unreachable

Symptoms:

1. `Unable to connect to the remote server`
2. `Test-NetConnection api.dokanx.com -Port 443` fails
3. health/readiness/metrics checks all return status `0`

What to do:

1. Confirm DNS resolves to the expected ingress or load balancer
2. Confirm firewall or VPN policy allows outbound access
3. If public DNS is not live yet, test against a reachable staging/internal URL:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-scaling-baseline.ps1 `
  -ApiBaseUrl http://staging-api.internal:3001 `
  -SkipKubernetes
```

## Recommended Validation Order

1. Fix Kubernetes context first
2. Fix API reachability second
3. Run verifier again
4. Run `npm run test:load:smoke`
5. Run `npm run test:load:mixed`

## Minimum Success Criteria Before Load Test

1. `kubectl get deploy -n dokanx` returns real workloads
2. `GET /health` works
3. `GET /health/readiness` works
4. `GET /metrics?format=prometheus` returns queue/outbox series
5. `GET /api/admin/metrics` returns JSON metrics
