const router = require("express").Router();
const controller = require("../controllers/task.controller");
const { protect } = require("../middlewares");

router.use(protect);

router.get("/", controller.listTasks);
router.post("/", controller.createTask);
router.put("/:taskId", controller.updateTask);
router.delete("/:taskId", controller.deleteTask);
router.patch("/:taskId/toggle", controller.toggleTaskCompletion);

module.exports = router;