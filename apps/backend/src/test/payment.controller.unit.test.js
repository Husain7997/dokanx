jest.mock("@/core/infrastructure", () => ({
  addJob: jest.fn(),
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
  t: jest.fn(() => "updated"),
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

const { addJob, t } = require("@/core/infrastructure");
const Order = require("../models/order.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const paymentService = require("../services/payment.service");
const { ensureIdempotent } = require("../utils/idempotency");
const { resolveBillingSnapshot } = require("../modules/billing/billingExecution.service");
const controller = require("../controllers/payment.controller");

describe("payment.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a pending attempt for initiate payment", async () => {
    Order.findById.mockResolvedValue({
      _id: "order-1",
      shop: "shop-1",
      totalAmount: 120,
    });
    PaymentAttempt.findOne.mockResolvedValue(null);
    resolveBillingSnapshot.mockResolvedValue({
      commission: { amount: 6, rate: 5 },
      routing: { destination: "PLATFORM_WALLET", source: "default" },
    });
    PaymentAttempt.create.mockResolvedValue({
      _id: "attempt-1",
      billingSnapshot: {
        commission: { amount: 6, rate: 5 },
        routing: { destination: "PLATFORM_WALLET", source: "default" },
      },
    });

    const json = jest.fn();
    const req = {
      params: { orderId: "order-1" },
      lang: "en",
      body: {
        paymentMethod: "bkash",
        hasOwnGateway: true,
      },
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };
    const next = jest.fn();

    await controller.initiatePayment(req, res, next);

    expect(addJob).toHaveBeenCalledWith("settlement", { orderId: "order-1" });
    expect(resolveBillingSnapshot).toHaveBeenCalledWith({
      tenantId: "shop-1",
      orderChannel: "ONLINE",
      paymentMethod: "BKASH",
      amount: 120,
      hasOwnGateway: true,
    });
    expect(t).toHaveBeenCalledWith("common.updated", "en");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      message: "updated",
      providerPaymentId: "pay_order-1",
      attemptId: "attempt-1",
      billing: {
        commission: { amount: 6, rate: 5 },
        routing: { destination: "PLATFORM_WALLET", source: "default" },
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return webhook failure as 400 without throwing", async () => {
    ensureIdempotent.mockRejectedValue(new Error("duplicate"));

    const json = jest.fn();
    const req = {
      headers: {},
      body: {},
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.paymentWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "duplicate",
    });
    expect(paymentService.handlePaymentWebhook).not.toHaveBeenCalled();
  });

  it("should return webhook success payload", async () => {
    ensureIdempotent.mockResolvedValue(true);
    paymentService.handlePaymentWebhook.mockResolvedValue({
      ok: true,
      billing: {
        routingDestination: "MERCHANT_DIRECT",
      },
    });

    const json = jest.fn();
    const req = {
      headers: { "idempotency-key": "evt-1" },
      body: { providerPaymentId: "pay-1" },
    };
    const res = {
      json,
    };

    await controller.paymentWebhook(req, res);

    expect(ensureIdempotent).toHaveBeenCalledWith("evt-1", "payment");
    expect(paymentService.handlePaymentWebhook).toHaveBeenCalledWith({
      providerPaymentId: "pay-1",
    });
    expect(json).toHaveBeenCalledWith({
      success: true,
      result: {
        ok: true,
        billing: {
          routingDestination: "MERCHANT_DIRECT",
        },
      },
    });
  });
});
