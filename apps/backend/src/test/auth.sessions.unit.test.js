jest.mock("../models/refreshToken.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
  find: jest.fn(),
}));

const RefreshToken = require("../models/refreshToken.model");
const authService = require("../modules/auth/auth.service");

describe("auth session service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should list active sessions in descending usage order", async () => {
    RefreshToken.find.mockReturnValue({
      sort: () => ({
        lean: async () => [
          {
            _id: "sess-1",
            deviceId: "phone",
            userAgent: "ua",
            ip: "127.0.0.1",
            createdAt: new Date("2026-01-01"),
            lastUsedAt: new Date("2026-01-02"),
            expiresAt: new Date("2026-02-01"),
          },
        ],
      }),
    });

    const sessions = await authService.listActiveSessions("user-1");

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe("sess-1");
  });
});
