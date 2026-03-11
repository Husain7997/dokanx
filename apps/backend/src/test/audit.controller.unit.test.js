jest.mock("../models/audit.model", () => ({
  find: jest.fn(() => ({
    populate: jest.fn(() => ({
      sort: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue([]),
      })),
    })),
  })),
}));

const AuditLog = require("../models/audit.model");
const controller = require("../controllers/audit.controller");

describe("audit.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return audit logs payload", async () => {
    const res = { json: jest.fn() };
    const req = { lang: "en" };

    await controller.getAuditLogs(req, res);

    expect(AuditLog.find).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: expect.any(String),
      data: [],
    });
  });
});
