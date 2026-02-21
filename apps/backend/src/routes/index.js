// apps/backend/src/routes/index.js

const express = require('express');
const router = express.Router();


// ---- Import route modules ----
const authRoutes = require("./auth.routes");
const shopRoutes = require("./shop.routes");
const productRoutes = require("./product.routes");
const orderRoutes = require("./order.routes");
const adminRoutes = require("./admin.routes");
const paymentRoutes = require("./payment.routes");
const settlementRoutes = require("./settlement.routes");
const shopPayoutRoutes = require('./shop/shop.payout.route');
// const adminRoutes = require('./admin/payout.routes');

const reportRoutes = require("./report.routes");
const settlementAdminRoutes = require('./admin/settlement.routes');
const walletShopRoutes = require('./shop/wallet.routes');
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

console.log("ADMIN FINANCE ROUTES LOADED");
router.use('/admin/finance', require('./admin/finance.routes'));


// ---- Routes ----
router.use("/auth", authRoutes);
router.use("/shops", shopRoutes);
router.use("/shop/payouts", shopPayoutRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/admin", adminRoutes);
router.use("/payments", paymentRoutes);
router.use("/settlements", settlementRoutes);
router.use("/report", reportRoutes);

// temporary dev routes
router.use("/reports", require("../modules/reporting/report.routes"));
router.use("/dev", require("./dev.routes"));



router.use('/shop', shopPayoutRoutes);
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
  "/api/inventory",
  require("./routes/inventory.routes")
);
router.use(
 "/webhooks",webhookRoutes);


module.exports = router;
