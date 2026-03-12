jest.mock("../platform/notifications/notification.service", () => ({
  enqueueNotification: jest.fn(),
}));

jest.mock("../modules/marketing/models/coupon.model", () => ({
  create: jest.fn(),
}));

jest.mock("../modules/referral-affiliate/referralAffiliate.service", () => ({
  redeemReferral: jest.fn(),
  createAffiliateCommission: jest.fn(),
}));

jest.mock("../models/shop.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../modules/automation/models/automationTask.model", () => ({
  create: jest.fn(),
}));

jest.mock("../modules/automation/models/loyaltyPointLedger.model", () => ({
  create: jest.fn(),
}));

const { enqueueNotification } = require("../platform/notifications/notification.service");
const Coupon = require("../modules/marketing/models/coupon.model");
const referralAffiliateService = require("../modules/referral-affiliate/referralAffiliate.service");
const Shop = require("../models/shop.model");
const AutomationTask = require("../modules/automation/models/automationTask.model");
const LoyaltyPointLedger = require("../modules/automation/models/loyaltyPointLedger.model");
const executor = require("../modules/automation/actionExecutor");

describe("automation.actionExecutor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should execute sms action", async () => {
    enqueueNotification.mockResolvedValue({ id: "job-1" });

    const result = await executor.executeAction({
      shopId: "shop-1",
      action: {
        type: "SEND_SMS",
        template: { body: "Order {{orderId}} delivered" },
      },
      context: { orderId: "order-1", customerPhone: "01700000000" },
    });

    expect(result.status).toBe("EXECUTED");
    expect(result.dispatch.jobId).toBe("job-1");
  });

  it("should create coupon action", async () => {
    Coupon.create.mockResolvedValue({
      _id: "coupon-1",
      code: "AUTO1",
      type: "FIXED",
      value: 100,
    });

    const result = await executor.executeAction({
      shopId: "shop-1",
      actorId: "user-1",
      action: {
        type: "CREATE_COUPON",
        coupon: { code: "AUTO1", type: "FIXED", value: 100 },
      },
      context: {},
    });

    expect(result.status).toBe("EXECUTED");
    expect(result.coupon.code).toBe("AUTO1");
  });

  it("should notify shop owner", async () => {
    enqueueNotification.mockResolvedValue({ id: "job-owner" });
    Shop.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        owner: { _id: "owner-1", email: "owner@example.com", phone: "01710000000" },
      }),
    });

    const result = await executor.executeAction({
      shopId: "shop-1",
      action: {
        type: "NOTIFY_SHOP_OWNER",
        template: { subject: "Low stock", body: "Restock {{productName}}" },
      },
      context: { productName: "Napa" },
    });

    expect(result.status).toBe("EXECUTED");
    expect(result.dispatch.userId).toBe("owner-1");
  });

  it("should redeem referral action", async () => {
    referralAffiliateService.redeemReferral.mockResolvedValue({ _id: "ref-1", status: "REDEEMED" });

    const result = await executor.executeAction({
      shopId: "shop-1",
      action: {
        type: "REDEEM_REFERRAL",
        code: "REFCODE",
      },
      context: { userId: "user-1" },
    });

    expect(result.status).toBe("EXECUTED");
    expect(result.referral.status).toBe("REDEEMED");
  });

  it("should create affiliate commission action", async () => {
    referralAffiliateService.createAffiliateCommission.mockResolvedValue({ _id: "comm-1", status: "PENDING" });

    const result = await executor.executeAction({
      shopId: "shop-1",
      action: {
        type: "CREATE_AFFILIATE_COMMISSION",
        affiliateUserId: "affiliate-1",
        orderId: "order-1",
        orderAmount: 5000,
        commissionAmount: 250,
      },
      context: {},
    });

    expect(result.status).toBe("EXECUTED");
    expect(result.commission.status).toBe("PENDING");
  });

  it("should create task action", async () => {
    AutomationTask.create.mockResolvedValue({ _id: "task-1", status: "OPEN" });

    const result = await executor.executeAction({
      shopId: "shop-1",
      action: {
        type: "CREATE_TASK",
        title: "Follow up {{orderId}}",
      },
      context: { orderId: "order-1" },
    });

    expect(result.status).toBe("EXECUTED");
    expect(result.task.status).toBe("OPEN");
  });

  it("should add loyalty points action", async () => {
    LoyaltyPointLedger.create.mockResolvedValue({ _id: "lp-1", points: 200 });

    const result = await executor.executeAction({
      shopId: "shop-1",
      action: {
        type: "ADD_LOYALTY_POINTS",
        points: 200,
        reason: "Reward for {{orderId}}",
      },
      context: { orderId: "order-1", customerUserId: "user-1" },
    });

    expect(result.status).toBe("EXECUTED");
    expect(result.ledger.points).toBe(200);
  });
});
