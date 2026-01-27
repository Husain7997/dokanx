const router = require('express').Router();
const ctrl = require('../../controllers/admin/compliance.controller');
const { protect } = require('../../middlewares/auth.middleware');
router.use(protect); 
const allowRoles = require('../../middlewares/rbac.middleware');

router.use(protect );
router.use(allowRoles('ADMIN'));

router.post('/lock-period', ctrl.lockPeriod);
router.get('/reconciliation', ctrl.reconciliationReports);

module.exports = router;
