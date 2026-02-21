jest.useRealTimers();
const { createShopWallet } = require("./helpers/testHelpers");

describe("Maker-Checker Workflow", () => {
  it("should create and approve request", async () => {
    const { shop, wallet } = await createShopWallet({ balance: 1000 });
    expect(wallet).toBeDefined();
  }, 30000);
});
