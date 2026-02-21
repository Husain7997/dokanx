jest.useRealTimers();
const { createShopWallet, createSettlement } = require("./helpers/testHelpers");

describe("Settlement Engine", () => {
  it("should calculate net payout correctly", async () => {
    const { shop, wallet } = await createShopWallet({ balance: 1000 });
    const settlement = await createSettlement({ shopId: shop._id });
    expect(settlement).toBeDefined();
    expect(settlement.netAmount)
  .toBe(settlement.totalAmount - settlement.commission);


  }, 30000);
});
