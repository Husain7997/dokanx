const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./supplierMarketplace.controller");
const validator = require("./supplierMarketplace.validator");

router.get(
  "/search",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateSupplierSearchQuery),
  controller.searchSuppliers
);

router.get(
  "/reliability/scoreboard",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateSupplierReliabilityQuery),
  controller.getSupplierReliabilityScoreboard
);

router.get(
  "/:supplierId/offers",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateSupplierIdParam),
  validateQuery(validator.validateSupplierOffersQuery),
  controller.getSupplierOffers
);

router.post(
  "/:supplierId/offers",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateParams(validator.validateSupplierIdParam),
  validateBody(validator.validateCreateOrUpdateOfferBody),
  controller.createSupplierOffer
);

router.put(
  "/:supplierId/offers/:offerId",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateParams(validator.validateOfferIdParam),
  validateBody(validator.validateCreateOrUpdateOfferBody),
  controller.updateSupplierOffer
);

router.post(
  "/bulk-orders",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateCreateBulkOrderBody),
  controller.createBulkOrderRequest
);

router.get(
  "/bulk-orders",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateBulkOrdersQuery),
  controller.listBulkOrderRequests
);

router.patch(
  "/bulk-orders/:orderId/status",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateBulkOrderIdParam),
  validateBody(validator.validateBulkOrderStatusBody),
  controller.updateBulkOrderStatus
);

module.exports = router;
