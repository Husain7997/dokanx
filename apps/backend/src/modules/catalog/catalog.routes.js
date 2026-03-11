const router = require("express").Router();
const { tenantAccess, ownerShopAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./catalog.controller");
const validator = require("./catalog.validator");

router.post(
  "/suggest",
  ...ownerShopAccess("OWNER", "ADMIN"),
  validateBody(validator.validateSuggest),
  controller.suggest
);

router.post(
  "/decision",
  ...ownerShopAccess("OWNER", "ADMIN"),
  validateBody(validator.validateDecision),
  controller.decision
);

router.post(
  "/import",
  ...ownerShopAccess("OWNER", "ADMIN"),
  validateBody(validator.validateImport),
  controller.importGlobalProduct
);

router.get(
  "/search",
  ...tenantAccess("OWNER", "ADMIN"),
  validateQuery(validator.validateSearchQuery),
  controller.searchGlobalProducts
);

router.post(
  "/global-product",
  ...ownerShopAccess("OWNER", "ADMIN"),
  validateBody(validator.validateCreateGlobalProduct),
  controller.createGlobalProduct
);

module.exports = router;
