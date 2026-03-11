const allowRolesWrapper = require("../middlewares/allowRoles");
const roleMiddleware = require("../middlewares/role.middleware");

describe("RBAC compatibility wrappers", () => {
  it("should normalize legacy aliases through shared allowRoles wrapper", () => {
    const req = { user: { role: "SHOP_OWNER" } };
    const res = {
      status: jest.fn(() => ({ json: jest.fn() })),
    };
    const next = jest.fn();

    allowRolesWrapper("OWNER")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should keep single-role legacy middleware behavior", () => {
    const req = { user: { role: "ADMIN" } };
    const res = {
      status: jest.fn(() => ({ json: jest.fn() })),
    };
    const next = jest.fn();

    roleMiddleware("ADMIN")(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
