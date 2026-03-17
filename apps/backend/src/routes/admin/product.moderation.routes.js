const router = require("express").Router();
const { protect, allowRoles } = require("../../middlewares");
const controller = require("../../controllers/admin/productModeration.controller");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.post("/products/:productId/moderate", controller.updateProductModeration);

module.exports = router;
