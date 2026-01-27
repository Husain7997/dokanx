jest.useRealTimers();
const { createShopWallet, createSettlement } = require("./helpers/testHelpers");

describe("Auto Settlement Idempotency", () => {
  it("should be idempotent for same auto-settlement key", async () => {
    const wallet = await createShopWallet({ balance: 1000 });
    const s1 = await createSettlement({ shopId: wallet.shopId });
    const s2 = await createSettlement({ shopId: wallet.shopId });
    expect(s1.netPayout).toBe(s2.netPayout);
  }, 30000);
});
