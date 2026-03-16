# DokanX Module Map

## Core Commerce
- Auth: `apps/backend/src/modules/auth`
- Tenant/Shop: `apps/backend/src/controllers/shop.controller.js`, `apps/backend/src/routes/shop.routes.js`
- Products: `apps/backend/src/controllers/product.controller.js`
- Inventory: `apps/backend/src/inventory`
- Cart: `apps/backend/src/controllers/cart.controller.js`
- Checkout: `apps/backend/src/core/checkout/checkout.engine.js`
- Orders: `apps/backend/src/controllers/order.controller.js`

## Financial
- Wallet: `apps/backend/src/services/wallet.service.js`
- Payments: `apps/backend/src/controllers/payment.controller.js`
- Settlements/Payouts: `apps/backend/src/routes/settlement.routes.js`

## Platform
- Developer APIs: `/developer`, `/oauth`, `/v1` routes
- Marketplace: `apps/backend/src/controllers/marketplace.controller.js`
- Webhooks: `apps/backend/src/services/webhook.service.js`

## Search
- Search routes: `apps/backend/src/routes/search.routes.js`
- Search index: `apps/backend/src/services/searchIndex.service.js`

## POS
- POS routes: `apps/backend/src/routes/pos.routes.js`

## Shipping/Location
- Shipping: `apps/backend/src/routes/shipping.routes.js`
- Locations: `apps/backend/src/routes/location.routes.js`

## Messaging/Notifications
- Notifications: `apps/backend/src/routes/notification.routes.js`

## Marketing/CMS
- Marketing: `apps/backend/src/routes/marketing.routes.js`
- CMS: `apps/backend/src/routes/cms.routes.js`
