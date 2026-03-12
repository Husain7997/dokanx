jest.mock("../intelligence/intelligenceTelemetry.service", () => ({
  recordIntelligenceMetric: jest.fn(async payload => payload),
}));

const { buildProductKnowledgeGraph } = require("../intelligence/productGraphBuilder");
const { searchCatalog } = require("../intelligence/searchEngine.service");
const { generateMerchantRecommendations } = require("../intelligence/merchantRecommendation.service");

describe("AI intelligence integration", () => {
  it("connects graph build, discovery, and recommendations in one flow", async () => {
    const rows = [
      {
        _id: "g1",
        canonicalName: "iPhone 13 128GB Blue",
        brand: "Apple",
        category: "Smartphone",
        barcode: "111",
      },
      {
        _id: "g2",
        canonicalName: "iPhone 13 256GB Blue",
        brand: "Apple",
        category: "Smartphone",
        barcode: "112",
      },
    ];
    const nodeModel = {
      findOneAndUpdate: jest.fn(async (query, update) => ({
        _id: `${query.nodeType}-${query.key}`,
        sourceRef: update.$set.sourceRef,
        nodeType: query.nodeType,
      })),
    };
    const edgeModel = {
      findOneAndUpdate: jest.fn(async (_query, update) => ({ _id: "edge", ...update.$set })),
    };

    const graph = await buildProductKnowledgeGraph({
      products: rows,
      dependencies: { models: { NodeModel: nodeModel, EdgeModel: edgeModel }, skipMetricPersist: true },
    });

    const search = await searchCatalog({
      query: "iphone",
      products: [
        {
          _id: "p1",
          name: "iPhone 13 128GB Blue",
          brand: "Apple",
          category: "Smartphone",
          price: 900,
          stock: 8,
          trustScore: 90,
          ratingAverage: 4.8,
          location: { lat: 23.81, lng: 90.41 },
        },
      ],
      origin: { lat: 23.82, lng: 90.42 },
    });

    const recommendations = await generateMerchantRecommendations({
      shopId: "shop-1",
      products: [
        {
          _id: "p1",
          name: "iPhone 13 128GB Blue",
          price: 900,
          stock: 8,
          dailySales: [1, 1, 2, 2, 2, 3, 3],
          competitorPrices: [950, 960],
          leadTimeDays: 3,
        },
      ],
      searches: [{ term: "iphone 13 128gb blue", count: 25 }],
    });

    expect(graph.nodeCount).toBeGreaterThan(0);
    expect(search.results[0].name).toMatch(/iphone/i);
    expect(recommendations.recommendations.length).toBeGreaterThan(0);
  });
});
