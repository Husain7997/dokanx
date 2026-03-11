const router = require('express').Router();
const ctrl = require('../../controllers/admin/finance.controller');
const { protect, allowRoles } = require('../../middlewares');
const { validateBody, validateQuery } = require('../../middlewares/validateRequest');
const FinanceController = require("../../controllers/admin/finance.controller");
const adminValidator = require("../../validators/admin.validator");

router.use(protect);
router.use(allowRoles('ADMIN'));



router.get("/", FinanceController.listFinances);
router.post("/settle", validateBody(adminValidator.validateFinanceSettleBody), FinanceController.settleFinance);
router.get('/kpi', ctrl.kpiSummary);
router.get('/revenue-vs-payout', ctrl.revenueVsPayout);
router.get('/top-shops', ctrl.topShops);
router.get('/payout-alerts', ctrl.payoutAlerts);
router.get('/platform-commission/summary', validateQuery(adminValidator.validatePlatformCommissionQuery), ctrl.platformCommissionSummary);
router.get('/platform-commission/entries', validateQuery(adminValidator.validatePlatformCommissionQuery), ctrl.platformCommissionEntries);
router.get('/platform-commission/export', validateQuery(adminValidator.validatePlatformCommissionQuery), ctrl.exportPlatformCommissionCSV);
router.get('/export/settlements', ctrl.exportSettlementsCSV);

module.exports = router;
