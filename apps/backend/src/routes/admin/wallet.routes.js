const router = require("express").Router();
const { protect, allowRoles } = require("../../middlewares");
const controller = require("../../controllers/admin/wallet.controller");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.post("/wallets/:shopId/freeze", controller.freezeWallet);
router.post("/wallets/:shopId/unfreeze", controller.unfreezeWallet);

module.exports = router;
