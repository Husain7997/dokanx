const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const { validateBody, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./backup.controller");
const validator = require("./backup.validator");

router.use(protect, allowRoles("ADMIN"));

router.get("/strategy", controller.getBackupStrategy);
router.get("/disaster-recovery", controller.getDisasterRecoveryProfile);

router.post(
  "/jobs",
  validateBody(validator.validateBackupJobBody),
  controller.createBackupJob
);

router.get("/jobs", controller.listBackupJobs);

router.patch(
  "/jobs/:jobId/status",
  validateParams(validator.validateIdParam),
  validateBody(validator.validateJobStatusBody),
  controller.updateBackupJobStatus
);

router.post(
  "/restore-requests",
  validateBody(validator.validateRestoreRequestBody),
  controller.createRestoreRequest
);

router.get("/restore-requests", controller.listRestoreRequests);

router.patch(
  "/restore-requests/:requestId/status",
  validateParams(validator.validateIdParam),
  validateBody(validator.validateRestoreStatusBody),
  controller.updateRestoreRequestStatus
);

module.exports = router;
