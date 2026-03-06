const router = require("express").Router();
const controller = require("./discovery.controller");
const { validateQuery } = require("@/middlewares/validateRequest");
const validator = require("./discovery.validator");

router.get("/products", validateQuery(validator.validateSearchQuery), controller.searchProducts);
router.get("/shops", validateQuery(validator.validateSearchQuery), controller.searchShops);

module.exports = router;
