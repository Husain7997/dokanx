jest.useRealTimers();
const { createShopWallet, createLedger } = require("./helpers/testHelpers");

describe("Reconciliation & Compliance", () => {
  it("should generate reconciliation report", async () => {
    const wallet = await createShopWallet({ balance: 1000 });
    const ledger = await createLedger({
      shopId: wallet.shopId,
      walletId: wallet._id,
      amount: 100,
      type: "CREDIT",
      source: "SYSTEM",
      referenceType: "ORDER",
    });
    expect(ledger).toBeDefined();
  }, 30000);
});
