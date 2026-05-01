jest.useRealTimers();

jest.mock("../infrastructure/notifications/sms.provider", () => ({
  sendSms: jest.fn().mockResolvedValue({ skipped: true }),
}));

jest.mock("../services/payout.service", () => ({
  approvePayout: jest.fn(async (payoutId, adminId) => ({
    _id: payoutId,
    status: "APPROVED",
    approvedBy: adminId,
  })),
  executePayout: jest.fn(async (payoutId, idempotencyKey) => ({
    _id: payoutId,
    status: "EXECUTED",
    idempotencyKey,
  })),
  processPayout: jest.fn(async ({ shopId }) => ({
    _id: `payout-${shopId}`,
    shopId,
    status: "PROCESSING",
  })),
  createShopPayoutRequest: jest.fn(async ({ shopId, amount, userId }) => ({
    _id: `request-${shopId}`,
    shopId,
    amount,
    requestedBy: userId,
    status: "REQUESTED",
  })),
}));

const request = require("supertest");
const app = require("../app");
const Order = require("../models/order.model");
const SensitiveOtpChallenge = require("../models/sensitiveOtpChallenge.model");
const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const payoutService = require("../services/payout.service");

describe("sensitive OTP hardening", () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Order.deleteMany({}),
      SensitiveOtpChallenge.deleteMany({}),
    ]);
    jest.clearAllMocks();
  });

  it("requires OTP verification before refunding a payment", async () => {
    const financeAdmin = await User.create({
      name: "Finance OTP",
      email: "finance-otp@example.com",
      phone: "01710000001",
      password: "hashed-password",
      role: "FINANCE_ADMIN",
    });

    const order = await Order.create({
      shopId: "507f1f77bcf86cd799439012",
      customerId: financeAdmin._id,
      user: financeAdmin._id,
      items: [{ name: "Rice", quantity: 1, price: 120 }],
      totalAmount: 120,
      paymentMode: "ONLINE",
      paymentStatus: "SUCCESS",
      status: "CONFIRMED",
    });

    const token = generateToken(financeAdmin);

    await request(app)
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orderId: String(order._id),
        amount: 120,
        reason: "customer-approved",
      })
      .expect(403);

    const challengeResponse = await request(app)
      .post("/api/auth/otp/challenge")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: "PAYMENT_REFUND",
        targetId: String(order._id),
        targetType: "order",
      })
      .expect(201);

    expect(challengeResponse.body.data.challengeId).toBeTruthy();
    expect(challengeResponse.body.data.previewCode).toMatch(/^\d{6}$/);

    await request(app)
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${token}`)
      .set("X-OTP-Challenge-Id", challengeResponse.body.data.challengeId)
      .set("X-OTP-Code", challengeResponse.body.data.previewCode)
      .send({
        orderId: String(order._id),
        amount: 120,
        reason: "customer-approved",
      })
      .expect(200);

    const challenge = await SensitiveOtpChallenge.findOne({
      challengeId: challengeResponse.body.data.challengeId,
    }).lean();

    expect(challenge.status).toBe("CONSUMED");
  });

  it("allows admin payout approval only with a valid OTP challenge", async () => {
    const admin = await User.create({
      name: "Admin OTP",
      email: "admin-otp@example.com",
      phone: "01710000002",
      password: "hashed-password",
      role: "ADMIN",
    });

    const token = generateToken(admin);
    const payoutId = "507f1f77bcf86cd799439021";

    await request(app)
      .post(`/api/admin/payouts/${payoutId}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    const challengeResponse = await request(app)
      .post("/api/auth/otp/challenge")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: "PAYOUT_APPROVE",
        targetId: payoutId,
        targetType: "payout",
      })
      .expect(201);

    const approveResponse = await request(app)
      .post(`/api/admin/payouts/${payoutId}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-OTP-Challenge-Id", challengeResponse.body.data.challengeId)
      .set("X-OTP-Code", challengeResponse.body.data.previewCode)
      .expect(200);

    expect(approveResponse.body.status).toBe("APPROVED");
    expect(payoutService.approvePayout).toHaveBeenCalledWith(payoutId, expect.anything());
  });
});
