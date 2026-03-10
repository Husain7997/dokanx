const {
  buildCanonicalKey,
  findDuplicateGlobalProduct,
} = require("../modules/catalog/deduplication.engine");
const catalogSearch = require("../modules/catalog/catalogSearch.service");

function mockModelChain(docs) {
  return {
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    async lean() {
      return docs;
    },
  };
}

describe("Phase 5 Catalog - Deduplication", () => {
  it("should build a stable canonical key", () => {
    const key = buildCanonicalKey({
      name: " Lux Soap 100g ",
      brand: "Unilever",
      category: "Soap",
    });

    expect(key).toBe("lux soap 100g|unilever|soap|");
  });

  it("should match duplicate by barcode first", async () => {
    const model = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ _id: "g1", barcode: "12345" }),
    };

    const result = await findDuplicateGlobalProduct({
      CatalogGlobalProduct: model,
      payload: {
        name: "Lux Soap 100g",
        barcode: "12345",
      },
    });

    expect(result.product).toBeTruthy();
    expect(result.reason).toBe("BARCODE_EXACT");
  });
});

describe("Phase 5 Catalog - Search Ranking", () => {
  it("should rank barcode exact match on top", async () => {
    const docs = [
      {
        _id: "g1",
        canonicalName: "Lux Soap 100g",
        normalizedName: "lux soap 100g",
        aliases: ["lux bar"],
        brand: "Unilever",
        category: "Soap",
        barcode: "222",
        confidence: 0.8,
        popularityScore: 5,
        updatedAt: new Date("2025-01-01"),
      },
      {
        _id: "g2",
        canonicalName: "Lux Soap 100g",
        normalizedName: "lux soap 100g",
        aliases: [],
        brand: "Unilever",
        category: "Soap",
        barcode: "111",
        confidence: 0.9,
        popularityScore: 1,
        updatedAt: new Date("2025-01-02"),
      },
    ];

    const model = {
      find: jest.fn(() => mockModelChain(docs)),
    };

    const result = await catalogSearch.searchGlobalProducts({
      CatalogGlobalProduct: model,
      query: { keyword: "lux soap", barcode: "111", limit: 10 },
    });

    expect(result[0]._id).toBe("g2");
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});
