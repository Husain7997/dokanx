jest.mock("../models/user.model", () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../models/refreshToken.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const RefreshToken = require("../models/refreshToken.model");
const controller = require("../modules/auth/auth.controller");

describe("auth.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return access and refresh tokens on login", async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "user-1",
        role: "CUSTOMER",
        shopId: null,
        password: await bcrypt.hash("secret", 1),
      }),
    });
    RefreshToken.create.mockResolvedValue({});

    const req = {
      body: { email: "a@test.com", password: "secret" },
      headers: {},
      lang: "en",
      ip: "127.0.0.1",
    };
    const res = { json: jest.fn() };

    await controller.login(req, res);

    expect(RefreshToken.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: expect.any(String),
        refreshToken: expect.any(String),
      })
    );
  });

  it("should reject invalid refresh token", async () => {
    RefreshToken.findOne.mockResolvedValue(null);

    const req = {
      body: { refreshToken: "bad-token" },
      headers: {},
      ip: "127.0.0.1",
    };
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.refresh(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid refresh token",
    });
  });

  it("should reject session listing without authenticated user", async () => {
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.listSessions({ user: null }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Unauthorized",
    });
  });

  it("should reject revoke-session without authenticated user", async () => {
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.revokeSession({ user: null, params: { sessionId: "sess-1" } }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Unauthorized",
    });
  });
});
