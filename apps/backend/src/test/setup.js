const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { performance } = require("perf_hooks");
const { redisClient } = require("../system/singletons/redisClient");
const { closeQueueInfra } = require("../platform/queue/queue.client");

if (!global.performance) {
  global.performance = performance;
}

dotenv.config({
  path: ".env.test",
  override: true,
  quiet: true,
});

if (!process.env.MONGO_URI_TEST) {
  throw new Error("MONGO_URI_TEST missing. Check .env.test");
}

jest.setTimeout(30000);

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI_TEST, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
    });
    console.log("MongoDB connected (test)");
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect().catch(() => {});
  }

  await closeQueueInfra().catch(() => {});
  await redisClient.quit().catch(() => {});
});

jest.mock("../middlewares/auth.middleware", () => ({
  protect: (req, _res, next) => {
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
  role: () => (_req, _res, next) => next(),
}));

jest.mock(
  "../middlewares/shop.middleware",
  () => ({
    protect: (_req, _res, next) => next(),
  }),
  { virtual: true }
);

global.validLedgerValues = {
  type: ["CREDIT", "DEBIT"],
  source: ["SYSTEM", "USER"],
  referenceType: ["ORDER", "SETTLEMENT", "REFUND"],
};
