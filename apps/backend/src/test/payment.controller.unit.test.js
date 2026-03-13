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

jest.mock("../infrastructure/payment/paymentGateway.service", () => ({
  createPayment: jest.fn(),
}));

const { addJob, t } = require("@/core/infrastructure");
const Order = require("../models/order.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const paymentService = require("../services/payment.service");
const { ensureIdempotent } = require("../utils/idempotency");
const { resolveBillingSnapshot } = require("../modules/billing/billingExecution.service");
const paymentGateway = require("../infrastructure/payment/paymentGateway.service");
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
      providerPaymentId: "pay_attempt-1",
      save: jest.fn(),
      billingSnapshot: {
        commission: { amount: 6, rate: 5 },
        routing: { destination: "PLATFORM_WALLET", source: "default" },
      },
    });
    paymentGateway.createPayment.mockResolvedValue({
      paymentURL: "https://bkash.mock/pay",
      txnId: "BKASH_1",
    });

    const json = jest.fn();
    const req = {
      params: { orderId: "order-1" },
      lang: "en",
      body: {
        paymentMethod: "bkash",
        hasOwnGateway: true,
      },
      headers: {
        origin: "http://localhost:3001",
        host: "localhost:3000",
      },
      protocol: "http",
      get: jest.fn(() => "localhost:3000"),
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
    expect(paymentGateway.createPayment).toHaveBeenCalledWith("bkash", {
      orderId: "order-1",
      amount: 120,
      attemptId: "attempt-1",
      providerPaymentId: "pay_attempt-1",
      paymentMethod: "BKASH",
      callbackUrl: expect.stringContaining("/api/payments/callback"),
      successUrl: expect.stringContaining("/payment/callback?status=success"),
      cancelUrl: expect.stringContaining("/payment/callback?status=failed"),
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      message: "updated",
      providerPaymentId: "pay_attempt-1",
      attemptId: "attempt-1",
      billing: {
        commission: { amount: 6, rate: 5 },
        routing: { destination: "PLATFORM_WALLET", source: "default" },
      },
      gateway: "bkash",
      provider: "bKash",
      handoffType: "REDIRECT",
      paymentUrl: "https://bkash.mock/pay",
      sessionId: null,
      transactionId: "BKASH_1",
      callbackUrl: expect.stringContaining("/api/payments/callback"),
      successUrl: expect.stringContaining("/payment/callback?status=success"),
      cancelUrl: expect.stringContaining("/payment/callback?status=failed"),
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
      body: { payment_id: "pay-1", payment_status: "SUCCESS" },
    };
    const res = {
      json,
    };

    await controller.paymentWebhook(req, res);

    expect(ensureIdempotent).toHaveBeenCalledWith("evt-1", "payment");
    expect(paymentService.handlePaymentWebhook).toHaveBeenCalledWith({
      providerPaymentId: "pay-1",
      webhookEventId: "",
      orderId: "",
      status: "SUCCESS",
      gateway: "",
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
