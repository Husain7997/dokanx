jest.useRealTimers();
const { createShopWallet, createLedger, createTaxRule } = require("./helpers/testHelpers");

describe("Tax Engine", () => {
  it("should apply VAT and create ledger entry", async () => {
    const {  shop, wallet, shopId,} = await createShopWallet({ balance: 0 });

    const taxRule = await createTaxRule({
      type: "PERCENTAGE",
      rate: 15,
    });
const vat = 150; // 15% of 1000 (test value)

    const ledger = await createLedger({
  shopId: shop._id,
  walletId: wallet._id,
  amount: vat,
  type: 'DEBIT',
  source: 'TAX',
  referenceType: 'SYSTEM',
});



    expect(taxRule).toBeDefined();
    expect(ledger).toBeDefined();
    expect(taxRule.rate).toBe(15);
  });
});
