const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody } = require("@/middlewares/validateRequest");
const controller = require("./customerSegmentation.controller");
const validator = require("./customerSegmentation.validator");

router.get("/segments", ...tenantAccess("OWNER", "ADMIN", "STAFF"), controller.listSegments);
router.post(
  "/segments",
  ...tenantAccess("OWNER", "ADMIN"),
  validateBody(validator.validateSegmentBody),
  controller.upsertSegment
);
router.post(
  "/segments/evaluate",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateBody(validator.validateSegmentEvaluationBody),
  controller.evaluateProfiles
);

module.exports = router;
