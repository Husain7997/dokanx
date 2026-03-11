jest.mock("../models/paymentAttempt.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  findById: jest.fn(),
}));

jest.mock("@/core/infrastructure", () => ({
  runOnce: jest.fn(async (_key, callback) => callback()),
}));

jest.mock("@/services/financialCommand.service", () => ({
  executeFinancial: jest.fn(),
}));

jest.mock("../modules/billing/billingExecution.service", () => ({
  buildSettlementBreakdown: jest.fn(),
}));

jest.mock("../modules/billing/platformBilling.service", () => ({
  recordPlatformCommission: jest.fn(),
}));

jest.mock("../modules/marketing/marketing.service", () => ({
  consumeCouponForOrder: jest.fn(),
}));

const PaymentAttempt = require("../models/paymentAttempt.model");
const Order = require("../models/order.model");
const { executeFinancial } = require("@/services/financialCommand.service");
const { buildSettlementBreakdown } = require("../modules/billing/billingExecution.service");
const { recordPlatformCommission } = require("../modules/billing/platformBilling.service");
const marketingService = require("../modules/marketing/marketing.service");
const paymentService = require("../services/payment.service");

describe("payment.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw when payment attempt is missing", async () => {
    PaymentAttempt.findOne.mockResolvedValue(null);

    await expect(
      paymentService.handlePaymentWebhook({
        providerPaymentId: "missing-pay",
        status: "SUCCESS",
      })
    ).rejects.toThrow("Attempt not found");
  });

  it("should return duplicate when attempt already succeeded", async () => {
    PaymentAttempt.findOne.mockResolvedValue({
      _id: "attempt-1",
      status: "SUCCESS",
    });

    const result = await paymentService.handlePaymentWebhook({
      providerPaymentId: "pay-1",
      status: "SUCCESS",
    });

    expect(result).toEqual({ duplicate: true });
    expect(Order.findById).not.toHaveBeenCalled();
    expect(executeFinancial).not.toHaveBeenCalled();
  });

  it("should mark failed webhook attempt without financial execution", async () => {
    const save = jest.fn();
    PaymentAttempt.findOne.mockResolvedValue({
      _id: "attempt-1",
      order: "order-1",
      amount: 1000,
      status: "PENDING",
      save,
    });

    const result = await paymentService.handlePaymentWebhook({
      providerPaymentId: "pay-1",
      status: "FAILED",
    });

    expect(result).toEqual({ ok: false });
    expect(save).toHaveBeenCalledTimes(1);
    expect(Order.findById).not.toHaveBeenCalled();
    expect(buildSettlementBreakdown).not.toHaveBeenCalled();
    expect(executeFinancial).not.toHaveBeenCalled();
    expect(recordPlatformCommission).not.toHaveBeenCalled();
  });

  it("should skip merchant wallet credit for merchant-direct routing", async () => {
    const save = jest.fn();
    PaymentAttempt.findOne.mockResolvedValue({
      _id: "attempt-1",
      order: "order-1",
      amount: 1000,
      status: "PENDING",
      billingSnapshot: {
        orderChannel: "ONLINE",
        paymentMethod: "BKASH",
        routing: { destination: "MERCHANT_DIRECT" },
      },
      save,
    });
    Order.findById.mockResolvedValue({
      _id: "order-1",
      shopId: "shop-1",
      appliedCoupon: {
        code: "SAVE10",
      },
    });
    buildSettlementBreakdown.mockResolvedValue({
      netAmount: 980,
      commissionAmount: 20,
      routingDestination: "MERCHANT_DIRECT",
      billingSnapshot: {
        routing: {
          destination: "MERCHANT_DIRECT",
          gatewayKey: "BKASH",
          source: "RULE",
        },
        commission: {
          rate: 2,
          amount: 20,
          source: "PLAN",
        },
      },
    });
    marketingService.consumeCouponForOrder.mockResolvedValue({
      consumed: true,
    });

    const result = await paymentService.handlePaymentWebhook({
      providerPaymentId: "pay-1",
      status: "SUCCESS",
    });

    expect(executeFinancial).not.toHaveBeenCalled();
    expect(recordPlatformCommission).toHaveBeenCalledWith({
      commissionAmount: 20,
      orderId: "order-1",
      attemptId: "attempt-1",
      sourceTenantId: "shop-1",
      idempotencyKey: "PLATFORM_COMMISSION_order-1_attempt-1",
    });
    expect(marketingService.consumeCouponForOrder).toHaveBeenCalledWith({
      shopId: "shop-1",
      order: {
        _id: "order-1",
        shopId: "shop-1",
        appliedCoupon: {
          code: "SAVE10",
        },
      },
    });
    expect(result).toEqual({
      ok: true,
      billing: {
        routingDestination: "MERCHANT_DIRECT",
        commissionAmount: 20,
        netAmount: 980,
        merchantCreditSkipped: true,
      },
      coupon: {
        code: "SAVE10",
        consumed: true,
      },
    });
    expect(save).toHaveBeenCalledTimes(2);
  });
});
