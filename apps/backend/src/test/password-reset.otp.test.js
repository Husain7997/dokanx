jest.useRealTimers();

jest.mock("../infrastructure/notifications/sms.provider", () => ({
  sendSms: jest.fn().mockResolvedValue({ skipped: true }),
}));

const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../app");
const User = require("../models/user.model");
const SensitiveOtpChallenge = require("../models/sensitiveOtpChallenge.model");
const RefreshToken = require("../models/refreshToken.model");

describe("password reset OTP flow", () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      SensitiveOtpChallenge.deleteMany({}),
      RefreshToken.deleteMany({}),
    ]);
    jest.clearAllMocks();
  });

  it("issues a password reset OTP and updates the password after verification", async () => {
    const user = await User.create({
      name: "Reset User",
      email: "reset-user@example.com",
      phone: "01710000009",
      password: await bcrypt.hash("OldPass123", 10),
      role: "CUSTOMER",
      sessionVersion: 1,
    });

    const requestResponse = await request(app)
      .post("/api/auth/password/forgot")
      .send({ email: user.email })
      .expect(200);

    expect(requestResponse.body.data.challengeId).toBeTruthy();
    expect(requestResponse.body.data.previewCode).toMatch(/^\d{6}$/);

    const resetResponse = await request(app)
      .post("/api/auth/password/reset")
      .send({
        email: user.email,
        code: requestResponse.body.data.previewCode,
        password: "NewPass123",
      })
      .expect(200);

    expect(resetResponse.body.success).toBe(true);

    const updatedUser = await User.findById(user._id).select("+password");
    const match = await bcrypt.compare("NewPass123", updatedUser.password);
    expect(match).toBe(true);
    expect(updatedUser.sessionVersion).toBe(2);

    const challenge = await SensitiveOtpChallenge.findOne({
      challengeId: requestResponse.body.data.challengeId,
    }).lean();
    expect(challenge.status).toBe("CONSUMED");
  });

  it("rejects password reset when OTP is invalid", async () => {
    const user = await User.create({
      name: "Reset Invalid",
      email: "reset-invalid@example.com",
      phone: "01710000010",
      password: await bcrypt.hash("OldPass123", 10),
      role: "CUSTOMER",
    });

    const requestResponse = await request(app)
      .post("/api/auth/password/forgot")
      .send({ email: user.email })
      .expect(200);

    await request(app)
      .post("/api/auth/password/reset")
      .send({
        email: user.email,
        code: "000000",
        password: "NewPass123",
      })
      .expect(403);

    const updatedUser = await User.findById(user._id).select("+password");
    const match = await bcrypt.compare("OldPass123", updatedUser.password);
    expect(match).toBe(true);

    const challenge = await SensitiveOtpChallenge.findOne({
      challengeId: requestResponse.body.data.challengeId,
    }).lean();
    expect(challenge.status).toBe("PENDING");
  });
});
