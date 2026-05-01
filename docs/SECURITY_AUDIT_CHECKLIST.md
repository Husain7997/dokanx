# DokanX Security Audit Checklist

## Objective

This checklist is for making DokanX enterprise-grade secure in a realistic way:
- Reduce attack surface
- Detect abuse early
- Preserve evidence
- Respond quickly and safely

This is not a "100% hack-proof" claim. It is an operational audit checklist for backend, frontend, mobile, payments, infra, and response.

## Severity Tiers

### Critical
- Exploit can expose money movement, auth, secrets, or tenant data
- Must be fixed before production rollout
- Examples: auth bypass, webhook signature bypass, cross-tenant data access, unauthenticated admin action

### High
- Exploit can degrade trust, leak sensitive data, or enable large-scale abuse
- Fix in current sprint
- Examples: weak validation on payment/order APIs, missing audit logs, overly broad role access

### Medium
- Exploit requires chaining or has reduced blast radius
- Fix in next sprint
- Examples: weak alerting thresholds, incomplete rate-limit coverage, missing device telemetry

### Low
- Hardening or operational improvement
- Track and schedule
- Examples: missing runbook detail, incomplete test coverage, noisy logs

## Current Repo Status Snapshot

### Implemented Recently
- Short-lived access token + refresh flow
- HTTP-only refresh cookie
- `/api/me` session validation path
- Security headers and stricter API middleware
- Request validation on high-risk routes
- RBAC + permission checks on critical order/payment/admin/product routes
- Webhook HMAC verification hardening
- Encrypted shop banking + KYC number fields

### Still Missing Or Partial
- OTP for sensitive actions
- WAF and perimeter controls
- Secret manager integration
- Centralized security event pipeline
- Auto block / incident response orchestration
- Route-by-route validation for all remaining endpoints
- IDS/Wazuh integration

## Critical Endpoint Checklist

### Auth
- [ ] `POST /api/auth/register` validates email, phone, password strength, and duplicate identity
- [ ] `POST /api/auth/login` rate-limits failed attempts and logs auth events
- [ ] `POST /api/auth/refresh` rejects revoked, expired, or replayed refresh tokens
- [ ] `POST /api/auth/logout` revokes refresh token and clears cookie
- [ ] `GET /api/me` never leaks password, token hashes, or hidden internal fields
- [ ] Invitation acceptance rotates session version and invalidates old sessions

### Orders
- [ ] `POST /api/orders` requires valid payload, authenticated customer context, and idempotency
- [ ] `GET /api/orders/my` only returns customer-owned orders
- [ ] `GET /api/orders/:orderId` blocks cross-tenant and cross-customer reads
- [ ] `PATCH /api/orders/:orderId/status` only allows approved status transitions
- [ ] Staff cannot update orders outside their merchant tenant

### Payments
- [ ] `POST /api/payments/initiate/:orderId` blocks access to orders not owned by caller
- [ ] `POST /api/payments/retry` requires valid order ID and allowed actor
- [ ] `POST /api/payments/refund` is restricted to finance/admin roles only
- [ ] `POST /api/payments/webhook` enforces signature verification and idempotency
- [ ] Duplicate webhook delivery cannot double-credit ledger
- [ ] Payment audit log includes provider, attempt ID, IP, request ID

### Products
- [ ] `POST /api/products` validates name, price, stock, and tenant ownership
- [ ] `POST /api/products/bulk` rejects malformed row batches
- [ ] `PATCH /api/products/:productId` stays tenant-scoped
- [ ] `DELETE /api/products/:productId` archives only same-tenant products
- [ ] `GET /api/products/:productId/inventory` requires merchant/admin permissions
- [ ] `POST /api/products/:productId/reviews` requires authenticated eligible role and validated payload

### Admin
- [ ] `PUT /api/admin/users/:id` only accessible by admin/support-admin with explicit permission
- [ ] `PUT /api/admin/users/:id/block` and `/unblock` produce audit logs
- [ ] `PUT /api/admin/shops/:id/approve` and `/suspend` are admin-only
- [ ] `GET /api/admin/orders` restricted to approved admin classes only
- [ ] `GET /api/admin/audit-logs` restricted to audit/admin roles
- [ ] No admin endpoint accepts arbitrary IDs without validation

## Route Families Still Needing Full Validation / Review

- [ ] `apps/backend/src/routes/wallet.routes.js`
- [ ] `apps/backend/src/routes/shop.routes.js`
- [ ] `apps/backend/src/routes/shipping.routes.js`
- [ ] `apps/backend/src/routes/finance.routes.js`
- [ ] `apps/backend/src/routes/notification.routes.js`
- [ ] `apps/backend/src/routes/cart.routes.js`
- [ ] `apps/backend/src/routes/checkout.routes.js`
- [ ] `apps/backend/src/modules/credit-engine/credit.routes.js`
- [ ] `apps/backend/src/routes/public/v1.routes.js`
- [ ] `apps/backend/src/modules/api-gateway/api-gateway.routes.js`

## Auto-Detect / Auto-Response Checklist

### Brute Force
- [ ] Detect repeated login failures per IP
- [ ] Detect repeated login failures per email/phone
- [ ] Auto-throttle first
- [ ] Auto-block or temporary lock after threshold
- [ ] Notify admin on spike

### Payment Abuse
- [ ] Detect repeated failed payment attempts per order
- [ ] Detect duplicate webhooks with inconsistent payloads
- [ ] Detect repeated refund attempts by same actor
- [ ] Force review if anomaly threshold crossed

### Session Abuse
- [ ] Detect refresh token reuse after revocation
- [ ] Detect same session token used from abnormal IP/device spread
- [ ] Auto-logout all sessions when replay is confirmed

## WAF / Edge Checklist

### Cloudflare
- [ ] DNS proxied through Cloudflare for public apps and APIs
- [ ] WAF enabled on API hostname
- [ ] Rate limit rule for `/api/auth/login`
- [ ] Rate limit rule for `/api/payments/*`
- [ ] Block obvious SQLi / XSS patterns
- [ ] Bot fight mode or bot management enabled

## Manual Test Matrix

| Area | Test | Expected Result | Severity |
|------|------|-----------------|----------|
| Auth | Reuse revoked refresh token | `401` + token cleared + event logged | Critical |
| Auth | 6+ failed logins in 1 minute | throttled / blocked | High |
| Orders | Customer requests another customer order | `403` | Critical |
| Payments | Customer initiates payment for another customer order | `403` | Critical |
| Payments | Duplicate webhook replay | no duplicate ledger entry | Critical |
| Payments | Refund without admin/finance role | `403` | Critical |
| Products | Negative price / stock payload | `400` validation fail | High |
| Admin | Customer calls admin user update route | `403` | Critical |
| Public API | key without scope calls protected endpoint | `403` / scope denied | Critical |
| Tenant | spoofed `x-tenant-id` for another shop | denied | Critical |

## Repo-Specific Test Commands

```powershell
cd apps/backend
cmd /c npx jest --runInBand --forceExit --runTestsByPath src/test/auth.register.test.js
cmd /c npx jest --runInBand --forceExit --runTestsByPath src/test/payment.webhook.hardening.test.js
cmd /c npx jest --runInBand --forceExit --runTestsByPath src/test/route.security.hardening.test.js
```

## Recommended Next Implementation Queue

### Critical Next
- [ ] Add OTP challenge middleware for payout/refund/password reset
- [ ] Add centralized security event logger
- [ ] Add IP block / suspicious activity model + middleware
- [ ] Add alert rules for auth failures and payment anomalies

### High Next
- [ ] Expand validation to wallet, shipping, finance, notification, credit, and public API routes
- [ ] Add Cloudflare WAF runbook and baseline rules
- [ ] Add Vault/Secrets Manager integration plan

## Audit Sign-Off

| Area | Owner | Date | Status |
|------|-------|------|--------|
| Auth | | | |
| Orders | | | |
| Payments | | | |
| Admin | | | |
| Public API | | | |
| Mobile | | | |
| Infra | | | |
