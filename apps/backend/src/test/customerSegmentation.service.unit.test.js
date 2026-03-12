jest.mock("../modules/customer/models/customerSegment.model", () => ({
  findOneAndUpdate: jest.fn(async (_query, update) => ({ ...update.$set, _id: "seg-1" })),
  find: jest.fn(() => ({
    sort: jest.fn(async () => [{ name: "VIP" }]),
  })),
}));

const CustomerSegment = require("../modules/customer/models/customerSegment.model");
const service = require("../modules/customer/customerSegmentation.service");

describe("customer segmentation service", () => {
  it("derives VIP and at-risk segments", () => {
    expect(service._internals.deriveSegment({ totalOrders: 10, lifetimeValue: 30000, inactiveDays: 5 })).toBe("VIP");
    expect(service._internals.deriveSegment({ totalOrders: 1, lifetimeValue: 100, inactiveDays: 60 })).toBe("AT_RISK");
  });

  it("evaluates profiles and updates summary", async () => {
    const result = await service.evaluateCustomerProfiles({
      shopId: "shop-1",
      profiles: [
        { customerId: "c1", totalOrders: 9, lifetimeValue: 10000, inactiveDays: 3 },
        { customerId: "c2", totalOrders: 1, lifetimeValue: 100, inactiveDays: 60 },
      ],
    });

    expect(result.summary.VIP).toBe(1);
    expect(result.summary.AT_RISK).toBe(1);
    expect(CustomerSegment.findOneAndUpdate).toHaveBeenCalled();
  });
});
