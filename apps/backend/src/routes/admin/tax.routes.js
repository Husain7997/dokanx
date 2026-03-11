const router = require('express').Router();
const ctrl = require('../../controllers/admin/tax.controller');
const { protect, allowRoles } = require('../../middlewares');
const { validateBody, validateParams, validateQuery } = require('../../middlewares/validateRequest');
const adminValidator = require("../../validators/admin.validator");

router.use(protect);
router.use(allowRoles('ADMIN'));

router.get('/', ctrl.listTaxRules);
router.post('/', validateBody(adminValidator.validateTaxRuleBody), ctrl.createTaxRule);
router.put('/:id', validateParams(adminValidator.validateTaxIdParam), validateBody(adminValidator.validateTaxRuleBody), ctrl.updateTaxRule);
router.get('/reports/vat-summary', validateQuery(adminValidator.validateVatReportQuery), ctrl.vatSummary);
router.get('/reports/vat-export', validateQuery(adminValidator.validateVatReportQuery), ctrl.exportVatCSV);
router.get('/reports/mushak-6.3/:orderId', validateParams(adminValidator.validateOrderIdParam), ctrl.getMushakInvoice);

module.exports = router;
