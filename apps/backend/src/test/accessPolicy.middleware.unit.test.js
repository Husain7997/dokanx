jest.mock("../middlewares", () => ({
  protect: jest.fn((_req, _res, next) => next()),
  allowRoles: jest.fn((...roles) => ({ kind: "allowRoles", roles })),
}));

jest.mock("../api/middleware/tenantGuard", () => ({
  tenantGuard: { kind: "tenantGuard" },
}));

jest.mock("../middlewares/checkShopOwnership", () => ({ kind: "checkShopOwnership" }));

const { protect, allowRoles } = require("../middlewares");
const { tenantGuard } = require("../api/middleware/tenantGuard");
const checkShopOwnership = require("../middlewares/checkShopOwnership");
const {
  tenantAccess,
  ownerShopAccess,
} = require("../middlewares/accessPolicy.middleware");

describe("accessPolicy.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should compose tenant access in the expected order", () => {
    const chain = tenantAccess("OWNER", "ADMIN");

    expect(chain).toEqual([
      protect,
      tenantGuard,
      { kind: "allowRoles", roles: ["OWNER", "ADMIN"] },
    ]);
    expect(allowRoles).toHaveBeenCalledWith("OWNER", "ADMIN");
  });

  it("should append shop ownership guard for owner access", () => {
    const chain = ownerShopAccess("OWNER");

    expect(chain).toEqual([
      protect,
      tenantGuard,
      { kind: "allowRoles", roles: ["OWNER"] },
      checkShopOwnership,
    ]);
  });
});
