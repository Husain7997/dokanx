jest.mock("axios", () => jest.fn());

const axios = require("axios");
const PathaoProvider = require("../modules/courier/providers/pathao.provider");

describe("courier live client", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  it("should execute courier request when live execution is enabled", async () => {
    process.env.COURIER_EXECUTE_REQUESTS = "true";
    process.env.PATHAO_BASE_URL = "https://pathao.test";
    process.env.PATHAO_API_KEY = "key-1";
    axios.mockResolvedValue({ status: 201, data: { id: "ext-1" } });

    const provider = new PathaoProvider();
    const result = await provider.createShipment({
      orderId: "order-1",
      trackingCode: "TRK-1",
      recipient: { name: "A", phone: "017", address: "Dhaka" },
    });

    expect(result.status).toBe("QUEUED");
    expect(result.dispatch.mode).toBe("LIVE_EXECUTED");
    expect(result.dispatch.responseStatus).toBe(201);
    expect(result.normalizedResponse.providerStatus).toBe(201);
  });
});
