jest.useRealTimers();

jest.mock("../infrastructure/notifications/sms.provider", () => ({
  sendSms: jest.fn().mockResolvedValue({ skipped: true }),
}));

jest.mock("@/core/financial/financial.engine", () => ({
  execute: jest.fn(async ({ shopId, amount }) => ({
    balance: 1000 + Number(amount || 0),
    shopId,
  })),
}));

jest.mock("../services/payout.service", () => ({
  processPayout: jest.fn(async ({ shopId }) => ({
    _id: `payout-${shopId}`,
    shopId,
    status: "SUCCESS",
    reference: `REF-${shopId}`,
  })),
  createShopPayoutRequest: jest.fn(),
  triggerSettlementPayout: jest.fn(async (settlementId, options = {}) => ({
    settlement: {
      _id: settlementId,
      status: options.forceRetry ? "PROCESSING" : "COMPLETED",
    },
    payout: {
      _id: `payout-${settlementId}`,
      reference: `REF-${settlementId}`,
    },
  })),
}));

const request = require("supertest");
const app = require("../app");
const Settlement = require("../models/settlement.model");
const SensitiveOtpChallenge = require("../models/sensitiveOtpChallenge.model");
const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const FinancialEngine = require("@/core/financial/financial.engine");
const payoutService = require("../services/payout.service");

describe("sensitive OTP expansion", () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Settlement.deleteMany({}),
      SensitiveOtpChallenge.deleteMany({}),
    ]);
    jest.clearAllMocks();
  });

  it("requires OTP for admin wallet refund adjustments", async () => {
    const admin = await User.create({
      name: "Adjustment Admin",
      email: "adjustment-admin@example.com",
      phone: "01710000003",
      password: "hashed-password",
      role: "ADMIN",
    });

    const token = generateToken(admin);
    const shopId = "507f1f77bcf86cd799439099";

    await request(app)
      .post("/api/admin/adjustments/refund")
      .set("Authorization", `Bearer ${token}`)
      .send({ shopId, amount: 300, reason: "manual-correction" })
      .expect(403);

    const challengeResponse = await request(app)
      .post("/api/auth/otp/challenge")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: "ADJUSTMENT_REFUND",
        targetId: shopId,
        targetType: "shop",
      })
      .expect(201);

    const response = await request(app)
      .post("/api/admin/adjustments/refund")
      .set("Authorization", `Bearer ${token}`)
      .set("X-OTP-Challenge-Id", challengeResponse.body.data.challengeId)
      .set("X-OTP-Code", challengeResponse.body.data.previewCode)
      .send({ shopId, amount: 300, reason: "manual-correction" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(FinancialEngine.execute).toHaveBeenCalled();
  });

  it("requires OTP for settlement payout triggering", async () => {
    const admin = await User.create({
      name: "Settlement Admin",
      email: "settlement-admin@example.com",
      phone: "01710000004",
      password: "hashed-password",
      role: "ADMIN",
    });

    const settlement = await Settlement.create({
      shopId: "507f1f77bcf86cd799439100",
      totalAmount: 1000,
      commission: 100,
      netAmount: 900,
      netPayout: 900,
      orderCount: 3,
      status: "PENDING",
    });

    const token = generateToken(admin);

    await request(app)
      .post(`/api/admin/settlements/${settlement._id}/payout`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    const challengeResponse = await request(app)
      .post("/api/auth/otp/challenge")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action: "SETTLEMENT_PAYOUT",
        targetId: String(settlement._id),
        targetType: "settlement",
      })
      .expect(201);

    const response = await request(app)
      .post(`/api/admin/settlements/${settlement._id}/payout`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-OTP-Challenge-Id", challengeResponse.body.data.challengeId)
      .set("X-OTP-Code", challengeResponse.body.data.previewCode)
      .expect(200);

    expect(response.body.message).toBe("Payout triggered");
    expect(payoutService.triggerSettlementPayout).toHaveBeenCalled();
    expect(String(payoutService.triggerSettlementPayout.mock.calls[0][0])).toBe(String(settlement._id));
  });
});
