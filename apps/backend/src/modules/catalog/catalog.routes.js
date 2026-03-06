const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const checkShopOwnership = require("@/middlewares/checkShopOwnership");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateBody } = require("@/middlewares/validateRequest");
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

module.exports = router;
