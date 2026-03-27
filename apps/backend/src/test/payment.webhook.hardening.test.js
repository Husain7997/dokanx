jest.useRealTimers();

jest.mock("../services/fraud.service", () => ({
  evaluateTransaction: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../modules/agent/agent.service", () => ({
  handleSuccessfulShopPayment: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../infrastructure/events/event.dispatcher", () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
}));

const mongoose = require("mongoose");
const handlePaymentWebhook = require("../services/payment.service").handlePaymentWebhook;
const Order = require("../models/order.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const AccountingEntry = require("../modules/wallet-engine/accountingEntry.model");
const { createShopWallet, createUser } = require("./helpers/testHelpers");

describe("Payment webhook hardening", () => {
  beforeEach(async () => {
    await Promise.all([
      Order.deleteMany({}),
      PaymentAttempt.deleteMany({}),
      AccountingEntry.deleteMany({}),
    ]);
  });

  it("records one ledger entry and one processed attempt under concurrent duplicate webhooks", async () => {
    const { shop } = await createShopWallet({ balance: 0 });
    const customer = await createUser({
      role: "CUSTOMER",
      email: `customer-${Date.now()}@test.com`,
    });

    const order = await Order.create({
      shopId: shop._id,
      customerId: customer._id,
      items: [],
      totalAmount: 275,
      paymentMode: "ONLINE",
      paymentStatus: "PENDING",
      status: "PAYMENT_PENDING",
      commissionSnapshot: {
        rate: 0,
        amount: 0,
        source: "test",
        appliedAt: new Date(),
        meta: {},
      },
    });

    const attempt = await PaymentAttempt.create({
      shopId: shop._id,
      order: order._id,
      gateway: "bkash",
      providerPaymentId: `pay-${Date.now()}`,
      amount: 275,
      status: "PENDING",
      processed: false,
    });

    const results = await Promise.all([
      handlePaymentWebhook({ providerPaymentId: attempt.providerPaymentId, status: "SUCCESS" }),
      handlePaymentWebhook({ providerPaymentId: attempt.providerPaymentId, status: "SUCCESS" }),
      handlePaymentWebhook({ providerPaymentId: attempt.providerPaymentId, status: "SUCCESS" }),
    ]);

    const [freshOrder, freshAttempt, entries] = await Promise.all([
      Order.findById(order._id).lean(),
      PaymentAttempt.findById(attempt._id).lean(),
      AccountingEntry.find({ shopId: shop._id, referenceId: String(order._id) }).lean(),
    ]);

    expect(results.filter((row) => row?.ok).length).toBeGreaterThanOrEqual(1);
    expect(freshOrder.paymentStatus).toBe("SUCCESS");
    expect(freshOrder.status).toBe("CONFIRMED");
    expect(freshAttempt.status).toBe("SUCCESS");
    expect(freshAttempt.processed).toBe(true);
    expect(entries).toHaveLength(1);
    expect(Number(entries[0].amount)).toBe(275);
    expect(entries[0].transactionType).toBe("income");
  }, 30000);
});
