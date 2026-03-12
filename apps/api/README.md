# DokanX API Workspace

This workspace is the monorepo-facing API entrypoint.

The running implementation remains in `apps/backend/src` to preserve compatibility, ledger integrity, and POS sync behavior.

Use `src/architecture.manifest.json` and `src/module-registry.json` to trace each API module to the existing backend route, controller, service, and model layers.
