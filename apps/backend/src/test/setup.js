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

jest.setTimeout(30000);

const shouldSkipDb =
  process.env.TEST_SKIP_DB === "true" ||
  process.env.TEST_USE_DB === "false";
const dbOptional =
  process.env.TEST_DB_OPTIONAL !== "false";

global.__TEST_DB_AVAILABLE = false;

beforeAll(async () => {
  if (shouldSkipDb) {
    return;
  }

  if (!process.env.MONGO_URI_TEST) {
    if (dbOptional) {
      return;
    }
    throw new Error("MONGO_URI_TEST missing. Check .env.test");
  }

  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI_TEST, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 5,
      });
      global.__TEST_DB_AVAILABLE = true;
      if (process.env.TEST_LOG_CONNECTIONS === "true") {
        console.log("MongoDB connected (test)");
      }
    } catch (err) {
      if (!dbOptional) {
        throw err;
      }
      global.__TEST_DB_AVAILABLE = false;
      if (process.env.TEST_LOG_CONNECTIONS === "true") {
        console.warn(`MongoDB test connection skipped: ${err.message}`);
      }
    }
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
