const router = require('express').Router();
const ctrl = require('../../controllers/admin/compliance.controller');
const { protect, allowRoles } = require('../../middlewares');
const { validateBody, validateQuery } = require('../../middlewares/validateRequest');
const adminValidator = require("../../validators/admin.validator");

router.use(protect);
router.use(allowRoles('ADMIN'));

router.post('/lock-period', validateBody(adminValidator.validateLockPeriodBody), ctrl.lockPeriod);
router.get('/reconciliation', validateQuery(adminValidator.validateReconciliationQuery), ctrl.reconciliationReports);
router.post('/reconciliation/platform-commission/run', validateBody(adminValidator.validatePlatformReconciliationRunBody), ctrl.runPlatformCommissionReconciliation);
router.get('/reconciliation/platform-commission', validateQuery(adminValidator.validatePlatformReconciliationListQuery), ctrl.platformCommissionReconciliationReports);

module.exports = router;
