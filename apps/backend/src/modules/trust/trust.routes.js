const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./trust.controller");
const validator = require("./trust.validator");

router.post(
  "/product-reviews",
  ...tenantAccess("CUSTOMER", "OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateProductReviewBody),
  controller.createProductReview
);

router.get(
  "/products/:productId/reviews",
  ...tenantAccess("CUSTOMER", "OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateProductIdParam),
  controller.listProductReviews
);

router.post(
  "/shop-reviews",
  ...tenantAccess("CUSTOMER", "OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateShopReviewBody),
  controller.createShopReview
);

router.get(
  "/shops/:shopId/rating",
  ...tenantAccess("CUSTOMER", "OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateShopIdParam),
  controller.getShopRating
);

router.post(
  "/buyer-claims",
  ...tenantAccess("CUSTOMER", "OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateBuyerClaimBody),
  controller.createBuyerClaim
);

router.get(
  "/buyer-claims",
  ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"),
  controller.listBuyerClaims
);

module.exports = router;
