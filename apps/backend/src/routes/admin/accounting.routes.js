const router = require('express').Router();
const ctrl = require('../../controllers/admin/accounting.controller');
const { protect } = require('../../middlewares/auth.middleware');
router.use(protect); 
const allowRoles = require('../../middlewares/rbac.middleware');

router.use(protect );
router.use(allowRoles('ADMIN'));

router.post('/export', ctrl.exportAccounting);

module.exports = router;
