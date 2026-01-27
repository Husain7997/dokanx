jest.useRealTimers();
const { createShopWallet } = require("./helpers/testHelpers");
const { processPayout } = require("../services/payout.service");
const Wallet = require("../models/wallet.model");


describe("Payout Retry", () => {
  it("should retry failed payout", async () => {
    const { wallet } = await createShopWallet({ balance: 1000 });
await Wallet.updateOne(
  { _id: wallet._id },
  { $set: { balance: 1000 } }
);

    const result = await processPayout(wallet._id);

    expect(result.status).toBe("SUCCESS");
  }, 30000);
});
