const request = require("supertest");
const app = require("../app");

describe("Adjustment Flow", () => {

  it("should adjust balance safely",
    async () => {

      const res = await request(app)
        .post("/api/admin/adjustments/adjust")
        .set("Authorization", "Bearer test-admin-token")
        .send({
          shopId:
            "000000000000000000000001",
          amount: 100,
          reason: "test",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success)
        .toBe(true);
    });
});
