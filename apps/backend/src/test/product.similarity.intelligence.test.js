jest.mock("../intelligence/intelligenceTelemetry.service", () => ({
  recordIntelligenceMetric: jest.fn(async payload => payload),
}));

const similarity = require("../intelligence/productSimilarity.service");
const graphService = require("../intelligence/knowledgeGraph.service");

describe("product intelligence similarity", () => {
  it("detects similar products and variants", () => {
    const result = similarity.computeSimilarity(
      {
        name: "iPhone 13 128GB Blue",
        brand: "Apple",
        category: "Smartphone",
      },
      {
        name: "Apple iPhone 13 256GB Blue",
        brand: "Apple",
        category: "Smartphone",
      }
    );

    expect(result.isSimilar).toBe(true);
    expect(result.isVariant).toBe(true);
    expect(result.score).toBeGreaterThan(0.6);
  });

  it("builds merge metadata for duplicate products", async () => {
    const upserts = [];
    const models = {
      NodeModel: {
        findOneAndUpdate: jest.fn(async (_query, update) => {
          upserts.push(update.$set);
          return { _id: `node-${upserts.length}`, sourceRef: update.$set.sourceRef, nodeType: "PRODUCT" };
        }),
      },
      EdgeModel: {
        findOneAndUpdate: jest.fn(async (_query, update) => ({ _id: "edge-1", ...update.$set })),
      },
      skipMetricPersist: true,
    };

    const result = await graphService.mergeDuplicateProducts({
      primaryProduct: {
        _id: "p1",
        canonicalName: "iPhone 13 128GB",
        brand: "Apple",
        category: "Smartphone",
      },
      duplicateProduct: {
        _id: "p2",
        canonicalName: "Apple iPhone 13 128 GB",
        brand: "Apple",
        category: "Smartphone",
      },
      models,
    });

    expect(result.merged).toBe(true);
    expect(result.similarity.isSimilar).toBe(true);
  });
});
