jest.mock("../models/user.model", () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));

const User = require("../models/user.model");
const controller = require("../controllers/user.controller");

describe("user.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 when unblock target user does not exist", async () => {
    User.findById.mockResolvedValue(null);

    const json = jest.fn();
    const req = {
      params: { id: "user-1" },
      lang: "en",
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await controller.unblockUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
  });
});
