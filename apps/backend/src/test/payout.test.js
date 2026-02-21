const { createShopWallet } = require("./helpers/testHelpers");
const { processPayout } = require("../services/payout.service");
const Wallet = require("../models/wallet.model"); // ✅ ADD

describe("Payout Gateway", () => {
  it("should trigger payout", async () => {
    const { wallet } = await createShopWallet({ balance: 1000 });

    // ✅ SET WITHDRAWABLE BALANCE
    await Wallet.updateOne(
      { _id: wallet._id },
      {
        $set: {
          withdrawable_balance: 1000,
          available_balance: 1000,
        },
      }
    );

    const result = await processPayout({ walletId: wallet._id });


    expect(result.status).toBe("SUCCESS");
  }, 30000);
});
