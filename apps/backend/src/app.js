const express = require("express");
const cors = require("cors");
const dotenv = require('dotenv');
const authRoutes = require("./routes/auth.routes");
const shopRoutes = require("./routes/shop.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("./routes/admin.routes");
const paymentRoutes = require("./routes/payment.routes");
const settlementRoutes = require("./routes/settlement.routes");
const errorHandler = require("./utils/errorHandler");
const { startAutoSettlementCron } = require("./jobs/autoSettlement.job");
const reportRoutes = require("./routes/report.routes");
const settlementAdminRoutes = require('./routes/admin/settlement.routes');
const walletShopRoutes = require('./routes/shop/wallet.routes');
const financeAdminRoutes = require('./routes/admin/finance.routes');
const adjustmentAdminRoutes = require('./routes/admin/adjustment.routes');
const complianceAdminRoutes = require('./routes/admin/compliance.routes');
const accountingAdminRoutes = require('./routes/admin/accounting.routes');
const taxAdminRoutes = require('./routes/admin/tax.routes');
const payoutAdminRoutes = require('./routes/admin/payout.routes');
const approvalAdminRoutes = require('./routes/admin/approval.routes');


// startAutoSettlementCron();

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/payments/webhook",
  express.raw({ type: "application/json" })
);


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/reports", reportRoutes);
app.use('/api/admin/settlements', settlementAdminRoutes );
app.use('/api/shop/wallet',walletShopRoutes );
app.use(
  '/api/admin/finance',financeAdminRoutes);
app.use(
  '/api/admin/adjustments',
adjustmentAdminRoutes);
app.use(
  '/api/admin/compliance', complianceAdminRoutes);
app.use(
  '/api/admin/accounting', accountingAdminRoutes);
app.use('/api/admin/taxes', taxAdminRoutes);
app.use('/api/admin/payouts', payoutAdminRoutes);
app.use('/api/admin/approval', approvalAdminRoutes);









// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", app: "DokanX Backend" });
});

app.use(errorHandler);

module.exports = app;
