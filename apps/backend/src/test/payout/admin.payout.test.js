const request = require("supertest");
const app = require("../../app");

const { createAdminAndLogin } = require("../helpers/auth.helper");
const { createPayoutRequest } = require("../helpers/payout.helper");

describe("ADMIN PAYOUT FLOW", () => {
  let adminToken;
  let payoutId;

  beforeAll(async () => {
    const admin = await createAdminAndLogin();
    adminToken = admin.token;

    const payout = await createPayoutRequest(4000);
    payoutId = payout._id;
  });

  it("admin can approve payout", async () => {
    const res = await request(app)
      .post(`/api/admin/payouts/${payoutId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("PROCESSING");
  });

  it("second approve remains idempotent in processing", async () => {
    const res = await request(app)
      .post(`/api/admin/payouts/${payoutId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect([200, 400]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.status).toBe("PROCESSING");
    }
  });
});
