jest.mock("../intelligence/merchantAssistant.service", () => ({
  generateMerchantAssistantAdvice: jest.fn(async payload => ({ ok: true, payload })),
}));

const merchantExtension = require("../extensions/merchant-assistant/dashboardAdvisory.service");
const aiBrain = require("../intelligence/ai-brain");
const graph = require("../intelligence/product-knowledge-graph");
const search = require("../intelligence/search-ranking-engine");

describe("extension and intelligence adapters", () => {
  it("exposes merchant assistant extension adapter", async () => {
    const result = await merchantExtension.getMerchantDashboardAdvisory({ shopId: "shop-1" });
    expect(result.ok).toBe(true);
  });

  it("exposes ai-brain and search/graph adapter surfaces", () => {
    expect(typeof aiBrain.demandForecast.forecastDemand).toBe("function");
    expect(typeof graph.graphBuilder.buildProductKnowledgeGraph).toBe("function");
    expect(typeof search.searchEngine.searchCatalog).toBe("function");
  });
});
