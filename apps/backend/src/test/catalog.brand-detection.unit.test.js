jest.mock("../modules/catalog/models/Brand.model", () => ({
  find: jest.fn(),
}));

const Brand = require("../modules/catalog/models/Brand.model");
const catalogService = require("../modules/catalog/catalog.service");

function mockFindBrands(rows, shouldThrow = false) {
  if (shouldThrow) {
    Brand.find.mockImplementation(() => {
      throw new Error("db error");
    });
    return;
  }

  Brand.find.mockReturnValue({
    select: () => ({
      lean: async () => rows,
    }),
  });
}

describe("Catalog Brand Detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    catalogService._internals.resetBrandCache();
  });

  it("should detect brand using exact word match", async () => {
    mockFindBrands([{ name: "Square Pharma" }, { name: "Unilever" }]);
    const result = await catalogService.detectBrand("Napa 500mg by Square Pharma");
    expect(result).toBe("Square Pharma");
  });

  it("should detect single-token brand", async () => {
    mockFindBrands([{ name: "ACI" }, { name: "Unilever" }]);
    const result = await catalogService.detectBrand("ACI Pure Salt 500g");
    expect(result).toBe("ACI");
  });

  it("should return empty when no brand is matched", async () => {
    mockFindBrands([{ name: "Square Pharma" }]);
    const result = await catalogService.detectBrand("Random Local Product");
    expect(result).toBe("");
  });

  it("should fail safe and return empty on brand lookup error", async () => {
    mockFindBrands([], true);
    const result = await catalogService.detectBrand("Square Pharma Napa");
    expect(result).toBe("");
  });
});
