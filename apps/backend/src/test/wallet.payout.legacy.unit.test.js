const request = require("supertest");
const express = require("express");

jest.mock("../core/idempotency/idempotency.service", () => ({
  findExisting: jest.fn(async () => null),
  saveResult: jest.fn(async () => true),
}));

jest.mock("../controllers/shop/wallet.controller", () => ({
  topupWallet: jest.fn((req, res) => res.json({ ok: true })),
  transferWallet: jest.fn((req, res) => res.json({ ok: true })),
}));

jest.mock("../services/payout.service", () => ({
  createShopPayoutRequest: jest.fn(),
}));

const walletController = require("../controllers/shop/wallet.controller");
const payoutService = require("../services/payout.service");
const walletRoutes = require("../routes/wallet.routes");
const payoutController = require("../controllers/shop/shopPayout.controller");

function buildApp(path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

describe("legacy wallet and payout surfaces", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject root wallet credit without idempotency key", async () => {
    const app = buildApp("/wallet", walletRoutes);
    const res = await request(app).post("/wallet/credit").send({ amount: 10 });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: "Idempotency-Key required",
      message: "Idempotency-Key required",
    });
    expect(walletController.topupWallet).not.toHaveBeenCalled();
  });

  it("should reject invalid root wallet debit payload", async () => {
    const app = buildApp("/wallet", walletRoutes);
    const res = await request(app)
      .post("/wallet/debit")
      .set("Idempotency-Key", "idem-1")
      .send({ toShopId: "", amount: -1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toContain("toShopId is required");
    expect(res.body.errors).toContain("amount must be greater than 0");
    expect(walletController.transferWallet).not.toHaveBeenCalled();
  });

  it("should return normalized payout request response", async () => {
    payoutService.createShopPayoutRequest.mockResolvedValue({
      _id: "pay-1",
      amount: 100,
      status: "PENDING",
    });
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await payoutController.requestPayout(
      {
        body: { amount: 100 },
        shop: { _id: "shop-1" },
        user: { id: "user-1" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: {
        _id: "pay-1",
        amount: 100,
        status: "PENDING",
      },
    });
  });
});
