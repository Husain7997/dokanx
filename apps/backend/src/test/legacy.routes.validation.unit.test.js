const request = require("supertest");
const express = require("express");

jest.mock("../middlewares", () => ({
  protect: (_req, _res, next) => next(),
  allowRoles: () => (_req, _res, next) => next(),
}));

jest.mock("@/api/middleware/tenantGuard", () => ({
  tenantGuard: (_req, _res, next) => next(),
}));

jest.mock("@/platform/rate-limit/redisRateLimiter", () => ({
  redisRateLimiter: () => (_req, _res, next) => next(),
}));

jest.mock("../middlewares/planGuard.middleware", () => () => (_req, _res, next) => next());

jest.mock("../controllers/settlement.controller", () => ({
  createSettlement: jest.fn((req, res) => res.json({ ok: true })),
  payoutSettlement: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../controllers/admin/settlement.controller", () => ({
  processSettlement: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../controllers/shop/wallet.controller", () => ({
  topupWallet: jest.fn((req, res) => res.json({ ok: true })),
  transferWallet: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../controllers/shop/shopPayout.controller", () => ({
  requestPayout: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../controllers/inventory.controller", () => ({
  getLowStockAlerts: jest.fn((req, res) => res.json({ ok: true })),
  adjustStock: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../controllers/shop.controller", () => ({
  createShop: jest.fn((req, res) => res.json({ ok: true })),
  updateOrderStatus: jest.fn((req, res) => res.json({ ok: true })),
  blockCustomer: jest.fn((req, res) => res.json({ ok: true })),
}));

const settlementController = require("../controllers/settlement.controller");
const adminSettlementController = require("../controllers/admin/settlement.controller");
const walletController = require("../controllers/shop/wallet.controller");
const inventoryController = require("../controllers/inventory.controller");
const shopController = require("../controllers/shop.controller");

const settlementRoutes = require("../routes/settlement.routes");
const walletRoutes = require("../routes/shop/wallet.routes");
const inventoryRoutes = require("../routes/inventory.routes");
const shopRoutes = require("../routes/shop.routes");

function buildApp(path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

describe("legacy route validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject invalid settlement create payload", async () => {
    const app = buildApp("/settlements", settlementRoutes);
    const res = await request(app).post("/settlements").send({ shopId: "", totalAmount: 0 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("shopId is required");
    expect(res.body.errors).toContain("totalAmount must be greater than 0");
    expect(settlementController.createSettlement).not.toHaveBeenCalled();
  });

  it("should reject invalid settlement process payload", async () => {
    const app = buildApp("/settlements", settlementRoutes);
    const res = await request(app).post("/settlements/process").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("settlementId is required");
    expect(adminSettlementController.processSettlement).not.toHaveBeenCalled();
  });

  it("should reject invalid wallet transfer payload", async () => {
    const app = buildApp("/wallet", walletRoutes);
    const res = await request(app).post("/wallet/transfer").send({ toShopId: "", amount: -1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("toShopId is required");
    expect(res.body.errors).toContain("amount must be greater than 0");
    expect(walletController.transferWallet).not.toHaveBeenCalled();
  });

  it("should reject invalid inventory adjustment payload", async () => {
    const app = buildApp("/inventory", inventoryRoutes);
    const res = await request(app).post("/inventory/adjust").send({ product: "", quantity: 0 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("product is required");
    expect(res.body.errors).toContain("quantity must be a non-zero number");
    expect(inventoryController.adjustStock).not.toHaveBeenCalled();
  });

  it("should reject invalid shop create payload", async () => {
    const app = buildApp("/shops", shopRoutes);
    const res = await request(app).post("/shops").send({ name: "" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("name is required");
    expect(shopController.createShop).not.toHaveBeenCalled();
  });

  it("should reject invalid shop status payload", async () => {
    const app = buildApp("/shops", shopRoutes);
    const res = await request(app).put("/shops/1/status").send({ status: "BAD" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("status is invalid");
    expect(shopController.updateOrderStatus).not.toHaveBeenCalled();
  });
});
