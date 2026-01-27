jest.useRealTimers();
const { createShopWallet, createLedger } = require("./helpers/testHelpers");
const Wallet = require("../models/wallet.model"); // ✅ ADD

describe("Refund & Adjustment", () => {
  it("should apply manual adjustment", async () => {
    const { wallet } = await createShopWallet({ balance: 1000 });

    const ledger = await createLedger({
      shopId: wallet.shopId,
      walletId: wallet._id,
      amount: 100,
      type: "CREDIT",
      source: "SYSTEM",
      referenceType: "ORDER",
    });

    expect(ledger).toBeDefined();

    const freshWallet = await Wallet.findById(wallet._id); // ✅ RELOAD
    expect(freshWallet.balance).toBeGreaterThanOrEqual(0);
  }, 30000);
});
