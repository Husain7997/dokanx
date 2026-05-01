jest.useRealTimers();

const request = require("supertest");
const app = require("../app");
const IpBlock = require("../models/ipBlock.model");
const SecurityEvent = require("../models/securityEvent.model");
const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");

describe("security auto response", () => {
  const previousAuthLimit = process.env.SECURITY_AUTH_FAIL_LIMIT;
  const previousAbuseLimit = process.env.SECURITY_ABUSE_FAIL_LIMIT;
  const previousWindow = process.env.SECURITY_AUTOBLOCK_WINDOW_MS;
  const previousDuration = process.env.SECURITY_AUTOBLOCK_DURATION_MS;

  beforeAll(() => {
    process.env.SECURITY_AUTH_FAIL_LIMIT = "3";
    process.env.SECURITY_ABUSE_FAIL_LIMIT = "3";
    process.env.SECURITY_AUTOBLOCK_WINDOW_MS = "600000";
    process.env.SECURITY_AUTOBLOCK_DURATION_MS = "600000";
  });

  afterAll(() => {
    process.env.SECURITY_AUTH_FAIL_LIMIT = previousAuthLimit;
    process.env.SECURITY_ABUSE_FAIL_LIMIT = previousAbuseLimit;
    process.env.SECURITY_AUTOBLOCK_WINDOW_MS = previousWindow;
    process.env.SECURITY_AUTOBLOCK_DURATION_MS = previousDuration;
  });

  beforeEach(async () => {
    await Promise.all([
      IpBlock.deleteMany({}),
      SecurityEvent.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  it("auto-blocks repeated login failures from the same IP", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "Wrong1234" })
        .expect(401);
    }

    const block = await IpBlock.findOne({ status: "BLOCKED" }).lean();
    expect(block).toBeTruthy();
    expect(block.source).toBe("AUTO");
    expect(block.reason).toContain("login failures");

    const blockedResponse = await request(app)
      .get("/api/health")
      .expect(403);

    expect(blockedResponse.body.message).toBe("IP blocked by security policy");
  });

  it("auto-blocks repeated forbidden abuse on sensitive routes", async () => {
    const customer = await User.create({
      name: "Sensitive Abuse",
      email: "sensitive-abuse@example.com",
      password: "hashed-password",
      role: "CUSTOMER",
    });

    const token = generateToken(customer);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app)
        .post("/api/payments/refund")
        .set("Authorization", `Bearer ${token}`)
        .send({
          orderId: "507f1f77bcf86cd799439011",
          amount: 12,
          reason: "abuse-check",
        })
        .expect(403);
    }

    const events = await SecurityEvent.find({ type: "API_ACCESS_DENIED" }).lean();
    expect(events.length).toBeGreaterThanOrEqual(3);

    const block = await IpBlock.findOne({ status: "BLOCKED" }).lean();
    expect(block).toBeTruthy();
    expect(block.source).toBe("AUTO");
  });
});
