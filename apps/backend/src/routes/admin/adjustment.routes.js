const router = require('express').Router();
const ctrl = require('../../controllers/admin/adjustment.controller');
const { protect } = require('../../middlewares/auth.middleware');
router.use(protect); 
const allowRoles = require('../../middlewares/rbac.middleware');

router.use(protect );
router.use(allowRoles('ADMIN'));

router.post('/refund', ctrl.refundShop);
router.post('/adjust', ctrl.adjustWallet);

module.exports = router;
