const { createShopWallet } = require("./helpers/testHelpers");
const Payout = require("../models/payout.model");
const { processPayout } = require("../services/payout.service");

describe("Payout Gateway", () => {
  it("should trigger payout", async () => {
    const { shopId, owner } = await createShopWallet({ balance: 1000 });

    await Payout.create({
      shopId,
      amount: 1000,
      requestedBy: owner._id,
      status: "PENDING",
      type: "MANUAL",
      reference: `TEST_REQ_${shopId}_${Date.now()}`,
    });

    const result = await processPayout({ shopId });

    expect(result.status).toBe("SUCCESS");
  }, 30000);
});
