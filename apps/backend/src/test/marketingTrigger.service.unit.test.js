jest.mock("../models/order.model", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../modules/marketing/marketing.service", () => ({
  executeAutomationTrigger: jest.fn(),
}));

const Order = require("../models/order.model");
const marketingService = require("../modules/marketing/marketing.service");
const triggerService = require("../modules/marketing/marketingTrigger.service");

describe("marketingTrigger.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should trigger welcome flow", async () => {
    marketingService.executeAutomationTrigger.mockResolvedValue([{ status: "EXECUTED" }]);

    const rows = await triggerService.triggerWelcomeFlow({
      shopId: "shop-1",
      user: { _id: "user-1", email: "a@example.com" },
    });

    expect(rows).toHaveLength(1);
    expect(marketingService.executeAutomationTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "WELCOME" })
    );
  });

  it("should trigger abandoned cart flow only when cart has items", async () => {
    marketingService.executeAutomationTrigger.mockResolvedValue([{ status: "EXECUTED" }]);

    const rows = await triggerService.triggerAbandonedCartFlow({
      shopId: "shop-1",
      cart: { items: [{ productId: "prod-1" }], totals: { subtotal: 100, quantity: 1, itemCount: 1 } },
      guestToken: "guest-1",
    });

    expect(rows).toHaveLength(1);
  });

  it("should only trigger first purchase on first order", async () => {
    Order.countDocuments.mockResolvedValue(1);
    marketingService.executeAutomationTrigger.mockResolvedValue([{ status: "EXECUTED" }]);

    const rows = await triggerService.triggerFirstPurchaseFlow({
      order: { _id: "order-1", shopId: "shop-1", user: "user-1", totalAmount: 300 },
    });

    expect(rows).toHaveLength(1);
    expect(marketingService.executeAutomationTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "FIRST_PURCHASE" })
    );
  });
});
