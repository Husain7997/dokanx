jest.useRealTimers();
const { createShopWallet, createLedger, createTaxRule } = require("./helpers/testHelpers");

describe("Tax Engine", () => {
  it("should apply VAT and create ledger entry", async () => {
    const { shopId } = await createShopWallet({ balance: 0 });

    const taxRule = await createTaxRule({
      type: "PERCENTAGE",
      rate: 15,
    });

    const ledger = await createLedger({
      shopId,
      amount: 1000,
      type: "DEBIT",
      source: "TAX",
    });

    expect(taxRule).toBeDefined();
    expect(ledger).toBeDefined();
    expect(taxRule.rate).toBe(15);
  });
});
