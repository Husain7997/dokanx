const router = require('express').Router();
const ctrl = require('../../controllers/admin/tax.controller');
const { protect } = require('../../middlewares/auth.middleware');
router.use(protect); 
const allowRoles = require('../../middlewares/rbac.middleware');

router.use(protect );
router.use(allowRoles('ADMIN'));

router.get('/', ctrl.listTaxRules);
router.post('/', ctrl.createTaxRule);
router.put('/:id', ctrl.updateTaxRule);

module.exports = router;
