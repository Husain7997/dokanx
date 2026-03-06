const request = require("supertest");
const app = require("../../app");

const { createShopOwnerAndLogin } = require("../helpers/auth.helper");
const { seedShopWallet } = require("../helpers/wallet.helper");

describe("SHOP PAYOUT FLOW", () => {
  let token;
  let shopId;

  beforeAll(async () => {
    const result = await createShopOwnerAndLogin();
    token = result.token;
    shopId = result.shopId;

    await seedShopWallet(shopId, 10000);
  });

  it("shop owner can create payout request", async () => {
    const res = await request(app)
      .post("/api/shop/wallet/payouts")
      .set("Authorization", `Bearer ${token}`)
      .set("x-test-shop-id", String(shopId))
      .send({
        amount: 5000,
        method: "bank",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("PENDING");
    expect(res.body.amount).toBe(5000);
  });

  it("shop owner cannot approve payout", async () => {
    const res = await request(app)
      .post("/api/admin/payouts/123/approve")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });
});
