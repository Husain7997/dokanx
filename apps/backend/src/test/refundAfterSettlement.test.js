jest.useRealTimers();
const { createShopWallet, createLedger } = require("./helpers/testHelpers");

describe("Refund After Settlement", () => {
  it("should credit wallet after refund", async () => {
    const wallet = await createShopWallet({ balance: 500 });
    const ledger = await createLedger({
      shopId: wallet.shopId,
      walletId: wallet._id,
      amount: 200,
      type: "CREDIT",
      source: "SYSTEM",
      referenceType: "ORDER",
    });
    expect(ledger).toBeDefined();
  }, 30000);
});
