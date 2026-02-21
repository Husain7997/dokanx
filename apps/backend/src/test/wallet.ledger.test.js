jest.useRealTimers();

const { createShopWallet, createLedger } = require("./helpers/testHelpers");

describe("Wallet & Ledger", () => {
  it("should credit wallet", async () => {
    const { shop, wallet } = await createShopWallet({ balance: 0 });
    const ledger = await createLedger({
      shopId: shop._id,
      walletId: wallet._id,
      amount: 500,
      type: "CREDIT",
      source: "SYSTEM",
      referenceType: "ORDER",
    });
    expect(ledger).toBeDefined();
  }, 30000);
});
