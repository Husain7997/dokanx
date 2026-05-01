const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let memoryServer = null;
const runOnceStore = new Map();
const shouldSkipMongoSetup = process.env.SKIP_MONGO_SETUP === "1";
const MONGO_LAUNCH_TIMEOUT_MS = Number(process.env.TEST_MONGO_LAUNCH_TIMEOUT_MS || 30000);
const MONGO_RETRY_COUNT = Number(process.env.TEST_MONGO_RETRY_COUNT || 2);

const mockRunOnceStore = new Map();

dotenv.config({
  path: ".env.test",
  override: true,
  quiet: true,
});

jest.setTimeout(60000);

async function createMemoryReplSetWithRetry() {
  let lastError = null;

  for (let attempt = 1; attempt <= MONGO_RETRY_COUNT; attempt += 1) {
    try {
      return await MongoMemoryReplSet.create({
        replSet: {
          count: 1,
          storageEngine: "wiredTiger",
          launchTimeout: MONGO_LAUNCH_TIMEOUT_MS,
        },
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

beforeAll(async () => {
  if (shouldSkipMongoSetup) {
    return;
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  const useRemoteTestDb = String(process.env.TEST_DB_MODE || "").toLowerCase() === "remote";
  if (!useRemoteTestDb) {
    memoryServer = await createMemoryReplSetWithRetry();
    process.env.MONGO_URI_TEST = memoryServer.getUri();
  }

  if (!process.env.MONGO_URI_TEST) {
    throw new Error("MONGO_URI_TEST missing and in-memory Mongo could not be started");
  }

  await mongoose.connect(process.env.MONGO_URI_TEST, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
  });

  const models = [
    require("../models/user.model"),
    require("../models/ipBlock.model"),
    require("../models/securityEvent.model"),
    require("../models/sensitiveOtpChallenge.model"),
    require("../models/refreshToken.model"),
    require("../models/order.model"),
    require("../models/paymentAttempt.model"),
    require("../models/wallet.model"),
    require("../modules/wallet-engine/accountingEntry.model"),
    require("../modules/credit/credit.account.model"),
    require("../modules/credit/credit.ledger.model"),
    require("../modules/credit-engine/creditSale.model"),
  ];

  await Promise.all(models.map(async (model) => {
    try {
      await model.createCollection();
    } catch (error) {
      if (error?.codeName !== "NamespaceExists") {
        throw error;
      }
    }
  }));
});

beforeEach(() => {
  runOnceStore.clear();
});

afterAll(async () => {
  if (shouldSkipMongoSetup) {
    return;
  }

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
});

jest.mock("../middlewares/shop.middleware", () => ({
  protect: (_req, _res, next) => next(),
}), { virtual: true });

jest.mock("@/core/infrastructure", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  redis: {
    status: "ready",
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue("PONG"),
    duplicate: jest.fn(() => ({
      on: jest.fn(),
      once: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
    })),
  },
  t: jest.fn((langOrKey, maybeKey) => maybeKey || langOrKey || ""),
  addJob: jest.fn().mockResolvedValue(undefined),
  publishEvent: jest.fn().mockResolvedValue(undefined),
  runOnce: jest.fn(async (key, handler) => {
    if (!mockRunOnceStore.has(key)) {
      const promise = Promise.resolve().then(handler);
      mockRunOnceStore.set(key, promise);
    }

    return mockRunOnceStore.get(key);
  }),
}));

jest.mock("@/core/infrastructure/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("@/core/infrastructure/redis.client", () => ({
  status: "ready",
  on: jest.fn(),
  once: jest.fn(),
  ping: jest.fn().mockResolvedValue("PONG"),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  eval: jest.fn().mockResolvedValue(1),
  duplicate: jest.fn(() => ({
    on: jest.fn(),
    once: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
  })),
  quit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/core/infrastructure/lock.manager", () => ({
  acquireLock: jest.fn(async () => ({ release: jest.fn() })),
  assertLockManagerHealthy: jest.fn(),
  withLock: jest.fn(async (_key, handler) => handler()),
}));

jest.mock("@/infrastructure/events/event.dispatcher", () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../utils/audit.util", () => ({
  createAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../infrastructure/payment/payoutGateway.service", () => ({
  processPayout: jest.fn().mockResolvedValue({ status: "processed" }),
  fakeBankTransfer: jest.fn().mockResolvedValue({ status: "processed" }),
  fakeBKashTransfer: jest.fn().mockResolvedValue({ status: "processed" }),
  fakeNagadTransfer: jest.fn().mockResolvedValue({ status: "processed" }),
}));

global.validLedgerValues = {
  type: ["CREDIT", "DEBIT"],
  source: ["SYSTEM", "USER"],
  referenceType: ["ORDER", "SETTLEMENT", "REFUND"],
};
