# Backend Structure

Canonical backend entrypoints and layers:

- `src/bootstrap/`
  App factory and server startup lifecycle.
- `src/routes/`
  HTTP route registration only.
- `src/controllers/`
  Request/response orchestration.
- `src/services/`
  Cross-module business logic.
- `src/modules/`
  Domain-oriented feature slices.
- `src/models/`
  Persistence models.
- `src/middlewares/`
  Express middleware.
- `src/infrastructure/`
  Database, events, sockets, rate limits, and external adapters.
- `src/config/`
  Runtime configuration and environment shaping.
- `src/test/`
  Active Jest test suite.

Legacy or supporting areas still present:

- `src/tests/`
  Older ad hoc test assets; not part of the main Jest suite.
- `src/testing/`
  Test helpers and simulation tooling.
- `src/docs/`
  Internal migration notes and audit artifacts.
- `src/load/`, `src/jobs/`, `src/workers/`
  Operational runners kept for compatibility.

Compatibility notes:

- `src/app.js` remains as the Express app export for tests and existing imports.
- `src/server.js` remains the runtime entrypoint used by npm scripts.
- New boot logic lives under `src/bootstrap/` and should be the default place for future startup changes.
