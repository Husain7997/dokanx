const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/notification.controller");

router.use(protect);

router.get("/", controller.listNotifications);
router.patch("/:notificationId/read", controller.markRead);
router.post("/", allowRoles("ADMIN"), controller.createNotification);

module.exports = router;
