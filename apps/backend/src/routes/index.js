// apps/backend/src/routes/index.js

const express = require('express');
const router = express.Router();


// ---- Import route modules ----
const meRoutes = require("./me.routes");
const platformRoutes = require('../modules/platform');
const authRoutes = require("../modules/auth/auth.routes");
const shopRoutes = require("./shop.routes");
const productRoutes = require("./product.routes");
const orderRoutes = require("./order.routes");
const checkoutRoutes = require("./checkout.routes");
const cartRoutes = require("./cart.routes");
const shippingRoutes = require("./shipping.routes");
const searchRoutes = require("./search.routes");
const posRoutes = require("./pos.routes");
const notificationRoutes = require("./notification.routes");
const marketingRoutes = require("./marketing.routes");
const cmsRoutes = require("./cms.routes");
const adminRoutes = require("./admin.routes");
const paymentRoutes = require("./payment.routes");
const settlementRoutes = require("./settlement.routes");
const shopPayoutRoutes = require('./shop/shop.payout.route');
// const adminRoutes = require('./admin/payout.routes');
const inventoryRoutes = require('./inventory.routes');    
const reportRoutes = require("../modules/reporting/report.routes");
const settlementAdminRoutes = require('./admin/settlement.routes');
const walletShopRoutes = require('./shop/wallet.routes');
const walletRoutes = require("./wallet.routes");
const adminMetricsRoutes  = require('./admin.metrics.routes');
const financeAdminRoutes = require('./admin/finance.routes');
const adjustmentAdminRoutes = require('./admin/adjustment.routes');
const complianceAdminRoutes = require('./admin/compliance.routes');
const accountingAdminRoutes = require('./admin/accounting.routes');
const taxAdminRoutes = require('./admin/tax.routes');
const payoutAdminRoutes = require('./admin/payout.routes');
const approvalAdminRoutes = require('./admin/approval.routes');
const healthRoute = require('./health.routes');
const systemRoute = require("../infrastructure/monitoring/health.routes");
const webhookRoutes = require('../infrastructure/webhook/webhook.routes');
const themeRoutes = require("./theme.routes");
const developerRoutes = require("./developer.routes");
const oauthRoutes = require("./oauth.routes");
const marketplaceRoutes = require("./marketplace.routes");
const publicV1Routes = require("./public/v1.routes");

router.use("/financial-test", require("./financial.test.routes"));
// ---- Routes ----
router.use("/", meRoutes);
router.use('/platform', platformRoutes);
router.use("/auth", authRoutes);
router.use("/shops", shopRoutes);
router.use("/shop/payouts", shopPayoutRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/cart", cartRoutes);
router.use("/shipping", shippingRoutes);
router.use("/search", searchRoutes);
router.use("/pos", posRoutes);
router.use("/notifications", notificationRoutes);
router.use("/marketing", marketingRoutes);
router.use("/cms", cmsRoutes);
router.use("/admin", adminRoutes);
router.use("/payments", paymentRoutes);
router.use("/settlements", settlementRoutes);
router.use("/report", reportRoutes);
router.use("/wallet", walletRoutes);
router.use("/themes", themeRoutes);
router.use("/developer", developerRoutes);
router.use("/oauth", oauthRoutes);
router.use("/marketplace", marketplaceRoutes);
router.use("/v1", publicV1Routes);

// temporary dev routes
router.use("/reports", require("../modules/reporting/report.routes"));
router.use("/dev", require("./dev.routes"));



// router.use('/admin', adminRoutes);

router.use('/admin/settlements', settlementAdminRoutes);
router.use('/shop/wallet', walletShopRoutes);
router.use(
 "/admin",  adminMetricsRoutes);
router.use('/admin/finance', financeAdminRoutes);
router.use('/admin/adjustments', adjustmentAdminRoutes);
router.use('/admin/compliance', complianceAdminRoutes);
router.use('/admin/accounting', accountingAdminRoutes);
router.use('/admin/taxes', taxAdminRoutes);
router.use('/admin/payouts', payoutAdminRoutes);
router.use('/admin/approval', approvalAdminRoutes);
router.use('/health', healthRoute);
router.use(
 "/system", systemRoute);

router.use(
 "/inventory", inventoryRoutes);
router.use(
 "/webhooks",webhookRoutes);


module.exports = router;
