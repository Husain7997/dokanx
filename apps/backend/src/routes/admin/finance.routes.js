const router = require('express').Router();
const ctrl = require('../../controllers/admin/finance.controller');
const { protect } = require('../../middlewares/auth.middleware');
router.use(protect); 
const allowRoles = require('../../middlewares/rbac.middleware');
const FinanceController = require("../../controllers/admin/finance.controller");

router.use(protect );
router.use(allowRoles('ADMIN'));



router.get("/", FinanceController.listFinances);
router.post("/settle", FinanceController.settleFinance);
router.get('/kpi', ctrl.kpiSummary);
router.get('/revenue-vs-payout', ctrl.revenueVsPayout);
router.get('/top-shops', ctrl.topShops);
router.get('/payout-alerts', ctrl.payoutAlerts);
router.get('/export/settlements', ctrl.exportSettlementsCSV);

module.exports = router;
