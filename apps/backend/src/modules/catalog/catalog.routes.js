const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const checkShopOwnership = require("@/middlewares/checkShopOwnership");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateBody, validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./catalog.controller");
const validator = require("./catalog.validator");

router.post(
  "/suggest",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  checkShopOwnership,
  validateBody(validator.validateSuggest),
  controller.suggest
);

router.post(
  "/decision",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  checkShopOwnership,
  validateBody(validator.validateDecision),
  controller.decision
);

router.post(
  "/import",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  checkShopOwnership,
  validateBody(validator.validateImport),
  controller.importGlobalProduct
);

router.get("/search", validateQuery(validator.validateSearchQuery), controller.searchGlobalProducts);

router.post(
  "/global-product",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  checkShopOwnership,
  validateBody(validator.validateCreateGlobalProduct),
  controller.createGlobalProduct
);

module.exports = router;
