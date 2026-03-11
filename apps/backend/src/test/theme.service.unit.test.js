jest.mock("../models/shop.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../modules/theme/models/shopTheme.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  insertMany: jest.fn(),
  create: jest.fn(),
}));

const Shop = require("../models/shop.model");
const ShopTheme = require("../modules/theme/models/shopTheme.model");
const service = require("../modules/theme/theme.service");

describe("theme.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should ensure preset themes", async () => {
    ShopTheme.find
      .mockReturnValueOnce({ lean: async () => [] })
      .mockReturnValueOnce({ lean: async () => [{ slug: "pharmacy" }] });

    await service.ensurePresetThemes();
    expect(ShopTheme.insertMany).toHaveBeenCalled();
  });

  it("should preview theme with css variables", async () => {
    ShopTheme.findById.mockReturnValue({
      lean: async () => ({
        _id: "theme-1",
        tokens: {
          primaryColor: "#111111",
          secondaryColor: "#222222",
          accentColor: "#333333",
          fontFamily: "Poppins",
          borderRadius: "ROUNDED",
          spacing: "BALANCED",
        },
        assets: {},
        metadata: {},
      }),
    });

    const row = await service.previewTheme({
      shopId: "shop-1",
      themeId: "theme-1",
      overrides: { tokens: { primaryColor: "#ff0000" } },
    });

    expect(row.cssVariables["--color-primary"]).toBe("#ff0000");
  });

  it("should apply theme to shop", async () => {
    const save = jest.fn().mockResolvedValue(true);
    Shop.findById.mockResolvedValue({
      _id: "shop-1",
      save,
    });
    ShopTheme.findById.mockReturnValue({
      lean: async () => ({
        _id: "theme-1",
        tokens: { primaryColor: "#111111" },
        assets: {},
        metadata: {},
      }),
    });

    const row = await service.applyThemeToShop({
      shopId: "shop-1",
      themeId: "theme-1",
      overrides: {},
    });

    expect(save).toHaveBeenCalled();
    expect(row.tokens.primaryColor).toBe("#111111");
  });
});
