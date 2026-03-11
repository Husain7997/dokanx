const validator = require("../modules/theme/theme.validator");

describe("theme.validator", () => {
  it("should reject invalid theme body", () => {
    const result = validator.validateThemeBody({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("name is required");
  });

  it("should require themeId for apply", () => {
    const result = validator.validateApplyThemeBody({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("themeId is required");
  });
});
