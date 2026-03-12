const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody } = require("@/middlewares/validateRequest");
const controller = require("./referralAffiliate.controller");
const validator = require("./referralAffiliate.validator");

router.post(
  "/referrals",
  ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"),
  validateBody(validator.validateCreateReferralBody),
  controller.createReferral
);

router.post(
  "/referrals/redeem",
  ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"),
  validateBody(validator.validateRedeemReferralBody),
  controller.redeemReferral
);

router.get(
  "/referrals",
  ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"),
  controller.listReferrals
);

router.post(
  "/affiliate-commissions",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateAffiliateCommissionBody),
  controller.createAffiliateCommission
);

router.get(
  "/affiliate-commissions",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listAffiliateCommissions
);

module.exports = router;
