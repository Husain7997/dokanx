const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateParams, validateQuery } = require("@/middlewares/validateRequest");
const controller = require("./support.controller");
const validator = require("./support.validator");

router.post(
  "/tickets",
  ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"),
  validateBody(validator.validateCreateTicketBody),
  controller.createTicket
);

router.get(
  "/tickets",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateTicketQuery),
  controller.listTickets
);

router.get(
  "/tickets/:ticketId",
  ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"),
  validateParams(validator.validateTicketIdParam),
  controller.getTicket
);

router.patch(
  "/tickets/:ticketId/status",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateTicketIdParam),
  validateBody(validator.validateUpdateTicketStatusBody),
  controller.updateTicketStatus
);

router.post(
  "/tickets/:ticketId/comments",
  ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"),
  validateParams(validator.validateTicketIdParam),
  validateBody(validator.validateCommentBody),
  controller.addComment
);

router.post(
  "/tickets/:ticketId/rating",
  ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"),
  validateParams(validator.validateTicketIdParam),
  controller.rateTicket
);

router.post(
  "/quick-replies",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateQuickReplyBody),
  controller.createQuickReply
);

router.get(
  "/quick-replies",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  controller.listQuickReplies
);

module.exports = router;
