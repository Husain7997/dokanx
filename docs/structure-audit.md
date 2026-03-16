# DokanX Structure Audit

## Current Repo Layout (Physical)
- `apps/backend`: Express/Mongoose monolith with modular routes/services
- `apps/frontend/storefront-web`: Customer web (Next.js)
- `apps/frontend/merchant-dashboard`: Merchant dashboard (Next.js)
- `apps/frontend/admin-panel`: Admin panel (Next.js)
- `apps/frontend/developer-portal`: Developer portal (Next.js)
- `apps/frontend/mobile-app/customer`: Customer mobile (React Native)
- `apps/frontend/mobile-app/merchent`: Merchant mobile (React Native)
- `apps/backend/packages/*`: Shared packages (auth, api-client, hooks, ui, utils, types, config)
- `sdk/`: JS/Python/PHP SDK stubs
- `scripts/`: helper scripts

## Expected Ultimate Structure Mapping
This repo currently uses an `apps/` root with `frontend/` + `backend/`. The target “DokanX Ultimate” structure can be achieved without breaking code by mapping existing paths:
- `apps/customer-web` => `apps/frontend/storefront-web`
- `apps/merchant-dashboard` => `apps/frontend/merchant-dashboard`
- `apps/admin-panel` => `apps/frontend/admin-panel`
- `apps/mobile-customer` => `apps/frontend/mobile-app/customer`
- `apps/mobile-merchant` => `apps/frontend/mobile-app/merchent`
- `backend/services/*` => `apps/backend/src/*` (modular services within monolith)
- `platform/*` => `apps/frontend/developer-portal` + backend developer APIs (`/developer`, `/marketplace`, `/oauth`)
- `packages/*` => `apps/backend/packages/*` + `sdk/`

## Missing Physical Folders (Now Added as Stubs)
- `platform/*`
- `infrastructure/*`
- `packages/*` (root-level)
- `docs/`, `tests/`

These are added as placeholders for future expansion while preserving existing code paths.
