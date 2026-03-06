jest.useRealTimers();

const { createShopWallet } = require("./helpers/testHelpers");
const Payout = require("../models/payout.model");
const { retryFailedPayout } = require("../services/payout.service");

describe("Payout Retry", () => {
  it("should retry failed payout", async () => {
    const { shopId, owner } = await createShopWallet({ balance: 1000 });

    await Payout.create({
      shopId,
      amount: 1000,
      requestedBy: owner._id,
      status: "FAILED",
      type: "MANUAL",
      reference: `TEST_FAIL_${shopId}_${Date.now()}`,
    });

    const result = await retryFailedPayout(shopId);

    expect(result.status).toBe("SUCCESS");
  }, 30000);
});
