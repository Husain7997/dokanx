const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/notification.controller");

router.use(protect);

router.get("/", controller.listNotifications);
router.get("/settings", controller.getSettings);
router.put("/settings", controller.updateSettings);
router.patch("/read-all", controller.markAllRead);
router.post("/push-tokens/register", controller.registerPushToken);
router.post("/push-tokens/unregister", controller.unregisterPushToken);
router.patch("/:notificationId/read", controller.markRead);
router.post("/", allowRoles("ADMIN"), controller.createNotification);
router.post("/send", allowRoles("ADMIN"), controller.sendNotification);

module.exports = router;
