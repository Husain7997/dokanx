# Analytics Layer

Existing backend analytics services already present in `apps/backend/src/analytics`:
- `dailySalesAggregate.service.js`
- `merchantCohort.service.js`
- `trendAnalytics.service.js`
- `regionalDemand.service.js`

Scheduling guidance:
- run pipelines against read replicas
- keep aggregation workloads in workers
- keep transactional database isolated from heavy reporting reads
