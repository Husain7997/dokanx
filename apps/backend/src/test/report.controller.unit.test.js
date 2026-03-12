jest.mock("../modules/reporting/report.service", () => ({
  shopSummary: jest.fn(),
  adminKPI: jest.fn(),
  settlementHistory: jest.fn(),
}));

const service = require("../modules/reporting/report.service");
const controller = require("../modules/reporting/report.controller");

function buildRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("report.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return shop summary using tenant shop context", async () => {
    service.shopSummary.mockResolvedValue({ sales: 10 });
    const req = {
      shop: { _id: "shop-1" },
      user: { shopId: "shop-legacy" },
      lang: "en",
    };
    const res = buildRes();

    await controller.getShopSummary(req, res);

    expect(service.shopSummary).toHaveBeenCalledWith("shop-1");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
