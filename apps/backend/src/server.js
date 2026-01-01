const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

app.use(express.json());

// ✅ AUTH ROUTES
const authRoutes = require("./modules/auth/auth.routes");
app.use("/api/auth", authRoutes);

// ✅ SHOP ROUTES
const shopRoutes = require("./routes/shop.routes");
app.use("/api/shops", shopRoutes);
console.log("AUTH ROUTES =>", authRoutes);
console.log("SHOP ROUTES =>", shopRoutes);
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

connectDB();

module.exports = app;