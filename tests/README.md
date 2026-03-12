# DokanX Test Topology

Existing backend tests remain in `apps/backend/src/test` and `apps/backend/src/tests`.

Monorepo test buckets:
- `tests/unit`
- `tests/integration`
- `tests/db-lifecycle`

Critical lifecycle coverage to preserve:
- order lifecycle
- wallet ledger integrity
- POS sync
- courier flow
- automation triggers
