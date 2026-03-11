jest.mock("../modules/auth/auth.service", () => ({
  signAccessToken: jest.fn(),
  issueRefreshToken: jest.fn(),
  rotateRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllRefreshTokens: jest.fn(),
  listActiveSessions: jest.fn(),
  revokeSessionById: jest.fn(),
  requestPhoneOtpLogin: jest.fn(),
  verifyPhoneOtpLogin: jest.fn(),
  requestMagicLinkLogin: jest.fn(),
  verifyMagicLinkLogin: jest.fn(),
}));

jest.mock("../models/user.model", () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}));

const authService = require("../modules/auth/auth.service");
const controller = require("../modules/auth/auth.controller");

describe("auth session controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return active sessions for authenticated user", async () => {
    authService.listActiveSessions.mockResolvedValue([
      { id: "sess-1", deviceId: "phone" },
    ]);

    const res = {
      json: jest.fn(),
    };

    await controller.listSessions({ user: { _id: "user-1" } }, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: "sess-1", deviceId: "phone" }],
    });
  });
});
