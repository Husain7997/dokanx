const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./merchantAssistant.controller");
const validator = require("./merchantAssistant.validator");

router.post(
  "/ops/query",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateOpsAssistantBody),
  controller.queryOpsAssistant
);

router.post(
  "/contact-requests",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateCreateContactRequestBody),
  controller.createContactRequest
);

router.get(
  "/contact-requests",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateContactRequestQuery),
  controller.listContactRequests
);

router.patch(
  "/contact-requests/:requestId/status",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateContactRequestIdParam),
  validateBody(validator.validateContactRequestStatusBody),
  controller.updateContactRequestStatus
);

module.exports = router;
