const request = require("supertest");
const express = require("express");

jest.mock("mongoose", () => {
  function Schema(definition) {
    this.definition = definition;
  }

  Schema.Types = {};

  return {
    startSession: jest.fn(),
    Schema,
    models: {},
    model: jest.fn(() => ({})),
    Types: {
      ObjectId: jest.fn(() => "generated-id"),
    },
  };
});

jest.mock("../middlewares", () => ({
  protect: (req, _res, next) => {
    const token = String(req.headers.authorization || "").replace("Bearer ", "");
    if (token === "customer-token") {
      req.user = { _id: "customer-1", role: "CUSTOMER", shopId: "shop-1" };
      req.shop = { _id: "shop-1" };
    }
    next();
  },
  allowRoles: () => (_req, _res, next) => next(),
}));

jest.mock("../middlewares/checkUserNotBlocked", () => (_req, _res, next) => next());
jest.mock("../middlewares/optionalAuth.middleware", () => (req, _res, next) => {
  const token = String(req.headers.authorization || "").replace("Bearer ", "");
  if (token === "customer-token") {
    req.user = { _id: "customer-1", role: "CUSTOMER", shopId: "shop-1" };
    req.shop = { _id: "shop-1" };
  }
  next();
});

jest.mock("@/core/checkout/checkout.engine", () => ({
  checkout: jest.fn(),
}));

jest.mock("@/core/infrastructure", () => ({
  publishEvent: jest.fn(),
  addJob: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  t: jest.fn(() => "updated"),
}));

jest.mock("@/modules/marketing/marketingTrigger.service", () => ({
  triggerFirstPurchaseFlow: jest.fn(),
}));

jest.mock("@/modules/cart/cart.service", () => ({
  clearCart: jest.fn(),
}));

jest.mock("@/modules/marketing/marketing.service", () => ({
  evaluateCoupon: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../models/payment.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/paymentAttempt.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../services/payment.service", () => ({
  handlePaymentWebhook: jest.fn(),
}));

jest.mock("../utils/idempotency", () => ({
  ensureIdempotent: jest.fn(),
}));

jest.mock("../modules/billing/billingExecution.service", () => ({
  resolveBillingSnapshot: jest.fn(),
}));

jest.mock("../infrastructure/payment/paymentGateway.service", () => ({
  createPayment: jest.fn(),
}));

const mongoose = require("mongoose");
const Order = require("../models/order.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const CheckoutEngine = require("@/core/checkout/checkout.engine");
const { resolveBillingSnapshot } = require("../modules/billing/billingExecution.service");
const paymentGateway = require("../infrastructure/payment/paymentGateway.service");

const orderRoutes = require("../routes/order.routes");
const paymentRoutes = require("../routes/payment.routes");

describe("customer purchase flow integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should login, create order, and prepare payment handoff", async () => {
    const session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn(),
    };
    mongoose.startSession.mockResolvedValue(session);

    const save = jest.fn();
    CheckoutEngine.checkout.mockResolvedValue({
      _id: "order-1",
      save,
    });
    Order.findById.mockResolvedValue({
      _id: "order-1",
      shopId: "shop-1",
      totalAmount: 5400,
    });
    PaymentAttempt.findOne.mockResolvedValue(null);
    PaymentAttempt.create.mockResolvedValue({
      _id: "attempt-1",
      providerPaymentId: "pay_attempt-1",
      save: jest.fn(),
      billingSnapshot: { routing: { destination: "PLATFORM_WALLET" } },
    });
    resolveBillingSnapshot.mockResolvedValue({
      routing: { destination: "PLATFORM_WALLET", source: "default" },
      commission: { amount: 5, rate: 1 },
    });
    paymentGateway.createPayment.mockResolvedValue({
      paymentURL: "https://bkash.mock/pay",
      txnId: "BKASH_123",
    });

    const app = express();
    app.use(express.json());
    app.post("/auth/login", (_req, res) =>
      res.json({
        success: true,
        accessToken: "customer-token",
        user: { _id: "customer-1", role: "CUSTOMER", shopId: "shop-1" },
      })
    );
    app.use("/orders", orderRoutes);
    app.use("/payments", paymentRoutes);

    const login = await request(app).post("/auth/login").send({
      email: "customer@test.com",
      password: "Password123!",
    });

    expect(login.statusCode).toBe(200);
    expect(login.body.accessToken).toBe("customer-token");

    const order = await request(app)
      .post("/orders")
      .set("Authorization", "Bearer customer-token")
      .send({
        shopId: "shop-1",
        items: [{ product: "507f1f77bcf86cd799439011", quantity: 1 }],
        totalAmount: 5400,
      });

    expect(order.statusCode).toBe(201);
    expect(order.body.data._id).toBe("order-1");

    const payment = await request(app)
      .post("/payments/initiate/order-1")
      .set("Authorization", "Bearer customer-token")
      .send({
        paymentMethod: "bkash",
        hasOwnGateway: false,
      });

    expect(payment.statusCode).toBe(201);
    expect(payment.body.paymentUrl).toBe("https://bkash.mock/pay");
    expect(payment.body.transactionId).toBe("BKASH_123");
  });
});
