const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let memoryServer = null;
const runOnceStore = new Map();

dotenv.config({
  path: ".env.test",
  override: true,
  quiet: true,
});

jest.setTimeout(30000);

beforeAll(async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const useRemoteTestDb = String(process.env.TEST_DB_MODE || "").toLowerCase() === "remote";
  if (!useRemoteTestDb) {
    memoryServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
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
  t: jest.fn((langOrKey, maybeKey) => maybeKey || langOrKey || ""),
  addJob: jest.fn().mockResolvedValue(undefined),
  publishEvent: jest.fn().mockResolvedValue(undefined),
  runOnce: jest.fn(async (key, handler) => {
    if (!runOnceStore.has(key)) {
      const promise = Promise.resolve().then(handler);
      runOnceStore.set(key, promise);
    }

    return runOnceStore.get(key);
  }),
}));

jest.mock("@/core/infrastructure/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
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
