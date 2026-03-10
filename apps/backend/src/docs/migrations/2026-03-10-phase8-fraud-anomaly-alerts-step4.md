# Phase 8 Step 4: Fraud Anomaly Alerts (2026-03-10)

## Scope
- Added read-only fraud anomaly endpoint for merchant risk monitoring.
- Correlates payout anomalies with credit risk exposure.
- No mutation in payout, credit ledger, wallet, or settlement flows.

## API
- `GET /insights/fraud/anomalies`
  - Query:
    - `days` (7-90 via shared validator)
    - `limit` (1-20)

## Signal Inputs
- Payout signals:
  - failure rate
  - payout amount spike vs previous period
- Credit signals:
  - high-risk credit account ratio
  - overdue account exposure

## Output
- Composite `fraudScore` + severity
- Prioritized alert list with per-signal metrics

## Postman
- `postman/dokanx.phase8.fraud-anomaly-alerts.collection.json`
