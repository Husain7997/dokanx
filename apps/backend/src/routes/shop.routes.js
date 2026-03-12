const express = require("express");
const router = express.Router();

const {
  createShop,
  updateOrderStatus,
  blockCustomer,
  updateMyShopSettings,
  listTeamMembers,
  addTeamMember,
  updateTeamMember
} = require('../controllers/shop.controller');

const { protect, allowRoles } = require("../middlewares");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateBody, validateParams } = require("../middlewares/validateRequest");
const legacyValidator = require("../validators/legacyRoutes.validator");

const canUpdateOrderStatus = (req, res, next) => next();

router.put(
  "/:shopId/block-user/:userId",
  protect,
  allowRoles("OWNER"),
  validateParams(legacyValidator.validateShopAndUserParams),
  blockCustomer
);

router.put(
  "/:id/status",
  protect,
  validateBody(legacyValidator.validateShopStatusBody),
  canUpdateOrderStatus,
  updateOrderStatus
);

router.put(
  "/me/settings",
  protect,
  tenantGuard,
  allowRoles("OWNER"),
  validateBody(legacyValidator.validateShopSettingsBody),
  updateMyShopSettings
);

router.get(
  "/me/team",
  protect,
  tenantGuard,
  allowRoles("OWNER"),
  listTeamMembers
);

router.post(
  "/me/team",
  protect,
  tenantGuard,
  allowRoles("OWNER"),
  validateBody(legacyValidator.validateTeamMemberBody),
  addTeamMember
);

router.patch(
  "/me/team/:userId",
  protect,
  tenantGuard,
  allowRoles("OWNER"),
  validateBody(legacyValidator.validateTeamMemberUpdateBody),
  updateTeamMember
);

router.post(
  "/",
  protect,
  allowRoles("OWNER", "ADMIN"),
  validateBody(legacyValidator.validateCreateShopBody),
  createShop
);

module.exports = router;
