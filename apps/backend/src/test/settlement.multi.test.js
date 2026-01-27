jest.useRealTimers();
const { createShopWallet, createSettlement } = require("./helpers/testHelpers");

describe("Multi-tenant settlement & payout", () => {
  it("should settle multiple shops independently", async () => {
    const shop1 = await createShopWallet({ balance: 500 });
    const shop2 = await createShopWallet({ balance: 700 });
    const s1 = await createSettlement({ shopId: shop1.shopId });
    const s2 = await createSettlement({ shopId: shop2.shopId });
    expect(s1).toBeDefined();
    expect(s2).toBeDefined();
  }, 30000);
});
