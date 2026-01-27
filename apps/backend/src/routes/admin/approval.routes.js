const router = require('express').Router();
const ctrl = require('../../controllers/admin/approval.controller');
const { protect } = require('../../middlewares/auth.middleware');
router.use(protect); 
const allowRoles = require('../../middlewares/rbac.middleware');

router.use(protect );

// Maker
router.post('/create', allowRoles('ADMIN', 'FINANCE_MAKER'), ctrl.create);

// Checker
router.post('/:requestId/approve', allowRoles('ADMIN', 'FINANCE_CHECKER'), ctrl.approve);
router.post('/:requestId/reject', allowRoles('ADMIN', 'FINANCE_CHECKER'), ctrl.reject);

// List
router.get('/pending', allowRoles('ADMIN', 'FINANCE_CHECKER'), ctrl.listPending);

module.exports = router;
