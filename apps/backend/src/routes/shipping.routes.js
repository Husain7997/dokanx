const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/shipping.controller");

router.get("/rates", controller.getRates);
router.get("/carriers", controller.listCarriers);
router.post("/shipments", protect, allowRoles("OWNER", "ADMIN"), controller.createShipment);
router.get("/track/:trackingNumber", controller.getTracking);
router.post("/webhooks", controller.handleWebhook);

module.exports = router;
