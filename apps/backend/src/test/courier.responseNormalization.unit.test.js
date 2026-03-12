const PathaoProvider = require("../modules/courier/providers/pathao.provider");
const RedxProvider = require("../modules/courier/providers/redx.provider");

describe("courier response normalization", () => {
  it("should normalize pathao response", () => {
    const provider = new PathaoProvider();
    const result = provider.normalizeCreateShipmentResponse(
      {
        accepted: true,
        responseStatus: 201,
        mode: "LIVE_EXECUTED",
        responseBody: { data: { consignment_id: "pathao-1" } },
      },
      { trackingCode: "TRK-1" }
    );

    expect(result.externalReference).toBe("pathao-1");
    expect(result.providerStatus).toBe(201);
  });

  it("should normalize redx response", () => {
    const provider = new RedxProvider();
    const result = provider.normalizeCreateShipmentResponse(
      {
        accepted: true,
        responseStatus: 200,
        mode: "LIVE_EXECUTED",
        responseBody: { tracking_id: "redx-1" },
      },
      { trackingCode: "TRK-1" }
    );

    expect(result.externalReference).toBe("redx-1");
    expect(result.providerStatus).toBe(200);
  });
});
