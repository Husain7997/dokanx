const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./merchantAssistant.controller");
const validator = require("./merchantAssistant.validator");

router.post(
  "/ops/query",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateOpsAssistantBody),
  controller.queryOpsAssistant
);

router.post(
  "/contact-requests",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateCreateContactRequestBody),
  controller.createContactRequest
);

router.get(
  "/contact-requests",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateContactRequestQuery),
  controller.listContactRequests
);

router.patch(
  "/contact-requests/:requestId/status",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateContactRequestIdParam),
  validateBody(validator.validateContactRequestStatusBody),
  controller.updateContactRequestStatus
);

module.exports = router;
