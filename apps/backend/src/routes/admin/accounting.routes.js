const router = require('express').Router();
const ctrl = require('../../controllers/admin/accounting.controller');
const { protect, allowRoles } = require('../../middlewares');
router.use(protect); 
// const allowRoles = require('../../middlewares/rbac.middleware');

router.use(protect );
router.use(allowRoles('ADMIN'));

router.post('/export', ctrl.exportAccounting);

module.exports = router;
