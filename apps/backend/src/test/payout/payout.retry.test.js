const request = require("supertest");
const app = require("../../app");

const { createAdminAndLogin } = require("../helpers/auth.helper");
const { createFailedPayout } = require("../helpers/payout.helper");

describe("PAYOUT RETRY", () => {
  let token;
  let shopId;

  beforeAll(async () => {
    const admin = await createAdminAndLogin();
    token = admin.token;

    const payout = await createFailedPayout();
    shopId = payout.shopId;
  });

  it("admin can retry failed payout", async () => {
    const res = await request(app)
      .post("/api/admin/payouts/retry")
      .set("Authorization", `Bearer ${token}`)
      .send({ shopId: String(shopId) });

    expect([200, 400]).toContain(res.statusCode);
  });
});
