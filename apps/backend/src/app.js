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
// app.use("/api/settlements", settlementRoutes);




// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", app: "DokanX Backend" });
});

app.use(errorHandler);

module.exports = app;
