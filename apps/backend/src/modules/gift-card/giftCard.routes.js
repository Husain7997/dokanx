const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody } = require("@/middlewares/validateRequest");
const controller = require("./giftCard.controller");
const validator = require("./giftCard.validator");

router.get("/", ...tenantAccess("OWNER", "ADMIN", "STAFF"), controller.listGiftCards);
router.post("/", ...tenantAccess("OWNER", "ADMIN"), validateBody(validator.validateGiftCardBody), controller.createGiftCard);
router.post("/:code/redeem", ...tenantAccess("OWNER", "ADMIN", "STAFF", "CUSTOMER"), validateBody(validator.validateRedeemBody), controller.redeemGiftCard);

module.exports = router;
