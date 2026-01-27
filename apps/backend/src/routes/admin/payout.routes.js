const router = require('express').Router();
const ctrl = require('../../controllers/admin/payout.controller');
const { protect } = require('../../middlewares/auth.middleware');
router.use(protect); 
const allowRoles = require('../../middlewares/rbac.middleware');
const financeLock = require('../../middlewares/financeLock.middleware');

router.use(protect );
router.use(allowRoles('ADMIN'));
router.use(financeLock); // Prevent mutation on locked period

router.post('/manual', ctrl.manualPayout);
router.post('/retry', ctrl.retryPayout);

module.exports = router;
