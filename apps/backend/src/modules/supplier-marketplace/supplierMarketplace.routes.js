const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./supplierMarketplace.controller");
const validator = require("./supplierMarketplace.validator");

router.get(
  "/search",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateSupplierSearchQuery),
  controller.searchSuppliers
);

router.get(
  "/reliability/scoreboard",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateSupplierReliabilityQuery),
  controller.getSupplierReliabilityScoreboard
);

router.get(
  "/:supplierId/offers",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateSupplierIdParam),
  validateQuery(validator.validateSupplierOffersQuery),
  controller.getSupplierOffers
);

router.post(
  "/:supplierId/offers",
  ...tenantAccess("OWNER", "ADMIN"),
  validateParams(validator.validateSupplierIdParam),
  validateBody(validator.validateCreateOrUpdateOfferBody),
  controller.createSupplierOffer
);

router.put(
  "/:supplierId/offers/:offerId",
  ...tenantAccess("OWNER", "ADMIN"),
  validateParams(validator.validateOfferIdParam),
  validateBody(validator.validateCreateOrUpdateOfferBody),
  controller.updateSupplierOffer
);

router.post(
  "/bulk-orders",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateCreateBulkOrderBody),
  controller.createBulkOrderRequest
);

router.get(
  "/bulk-orders",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBulkOrdersQuery),
  controller.listBulkOrderRequests
);

router.patch(
  "/bulk-orders/:orderId/status",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateBulkOrderIdParam),
  validateBody(validator.validateBulkOrderStatusBody),
  controller.updateBulkOrderStatus
);

module.exports = router;
