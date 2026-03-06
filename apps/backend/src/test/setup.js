const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { performance } = require("perf_hooks");

if (!global.performance) {
  global.performance = performance;
}

// Load test env
dotenv.config({
  path: ".env.test",
  override: true,
  quiet: true,
});

if (!process.env.MONGO_URI_TEST) {
  throw new Error("❌ MONGO_URI_TEST missing. Check .env.test");
}

jest.setTimeout(30000);

// 🔹 Connect ONCE before all tests
beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI_TEST, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
    });
    console.log("✅ MongoDB connected (test)");
  }
});

// 🔹 Cleanup AFTER all tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log("✅ MongoDB disconnected (test)");
  }
});

// 🔹 Auth mocks
jest.mock("../middlewares/auth.middleware", () => ({
  protect: (req, res, next) => {
    const auth = String(req.headers.authorization || "");
    const isOwner = auth.includes("owner");
    const shopId = req.headers["x-test-shop-id"] || "000000000000000000000001";
    const userId = isOwner
      ? "0000000000000000000000a1"
      : "0000000000000000000000a2";

    req.user = {
      _id: userId,
      id: userId,
      role: isOwner ? "OWNER" : "ADMIN",
      shopId,
    };
    req.shop = { _id: shopId, id: shopId };
    next();
  },
  role: () => (req, res, next) => next(),
}));

jest.mock("../middlewares/shop.middleware", () => ({
  protect: (req, res, next) => next(),
}), { virtual: true });

// 🔹 Global helpers
global.validLedgerValues = {
  type: ["CREDIT", "DEBIT"],
  source: ["SYSTEM", "USER"],
  referenceType: ["ORDER", "SETTLEMENT", "REFUND"],
};
