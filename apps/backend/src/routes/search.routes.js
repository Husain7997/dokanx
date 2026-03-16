const router = require("express").Router();
const controller = require("../controllers/search.controller");

router.get("/products", controller.searchProducts);
router.get("/shops", controller.searchShops);

module.exports = router;
