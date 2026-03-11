jest.mock("../models/user.model", () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../models/refreshToken.model", () => ({
  create: jest.fn(),
}));

jest.mock("../modules/auth/models/authOtpRequest.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../modules/auth/models/magicLinkToken.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));

const User = require("../models/user.model");
const RefreshToken = require("../models/refreshToken.model");
const AuthOtpRequest = require("../modules/auth/models/authOtpRequest.model");
const MagicLinkToken = require("../modules/auth/models/magicLinkToken.model");
const service = require("../modules/auth/auth.service");

describe("auth passwordless flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  });

  it("should create otp login request with debug code in test", async () => {
    User.findOne.mockResolvedValue({ _id: "user-1", phone: "01700000000" });
    AuthOtpRequest.create.mockImplementation(async payload => ({ _id: "otp-1", ...payload }));

    const result = await service.requestPhoneOtpLogin("8801700000000", {
      headers: {},
      body: {},
      ip: "::1",
    });

    expect(result.requestId).toBe("otp-1");
    expect(result.phone).toBe("01700000000");
    expect(result.debugCode).toMatch(/^\d{6}$/);
  });

  it("should verify otp login and return user", async () => {
    const record = {
      userId: "user-1",
      phone: "01700000000",
      otpHash: service._internals ? "unused" : "unused",
      expiresAt: new Date(Date.now() + 60000),
      attempts: 0,
      consumedAt: null,
      save: jest.fn().mockResolvedValue(true),
    };
    const code = "123456";
    record.otpHash = require("crypto").createHash("sha256").update(code).digest("hex");

    AuthOtpRequest.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(record),
    });
    User.findById.mockResolvedValue({ _id: "user-1", role: "CUSTOMER", shopId: null });

    const user = await service.verifyPhoneOtpLogin("01700000000", code);
    expect(user._id).toBe("user-1");
    expect(record.save).toHaveBeenCalled();
  });

  it("should request and verify magic link", async () => {
    User.findOne.mockResolvedValue({ _id: "user-2", email: "a@example.com" });
    MagicLinkToken.create.mockImplementation(async payload => ({ _id: "ml-1", ...payload }));

    const requested = await service.requestMagicLinkLogin("a@example.com", {
      headers: {},
      body: {},
      ip: "::1",
    });

    expect(requested.requestId).toBe("ml-1");
    expect(requested.debugToken).toBeTruthy();

    const record = {
      userId: "user-2",
      expiresAt: new Date(Date.now() + 60000),
      consumedAt: null,
      save: jest.fn().mockResolvedValue(true),
    };

    MagicLinkToken.findOne.mockResolvedValue(record);
    User.findById.mockResolvedValue({ _id: "user-2", role: "CUSTOMER", shopId: null });

    const user = await service.verifyMagicLinkLogin(requested.debugToken);
    expect(user._id).toBe("user-2");
    expect(record.save).toHaveBeenCalled();
  });

  it("should reject expired otp request", async () => {
    AuthOtpRequest.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue({
        userId: "user-1",
        phone: "01700000000",
        otpHash: "hash",
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
        consumedAt: null,
        save: jest.fn(),
      }),
    });

    await expect(
      service.verifyPhoneOtpLogin("01700000000", "123456")
    ).rejects.toThrow("OTP expired");
  });

  it("should reject otp when attempts exceeded", async () => {
    AuthOtpRequest.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue({
        userId: "user-1",
        phone: "01700000000",
        otpHash: "hash",
        expiresAt: new Date(Date.now() + 60000),
        attempts: 99,
        consumedAt: null,
        save: jest.fn(),
      }),
    });

    await expect(
      service.verifyPhoneOtpLogin("01700000000", "123456")
    ).rejects.toThrow("OTP attempts exceeded");
  });

  it("should reject unknown magic link token", async () => {
    MagicLinkToken.findOne.mockResolvedValue(null);

    await expect(
      service.verifyMagicLinkLogin("missing-token")
    ).rejects.toThrow("Magic link not found");
  });
});
