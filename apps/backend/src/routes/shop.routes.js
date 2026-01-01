const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { createShop } = require("../controllers/shop.controller");

router.post("/", auth, createShop);

module.exports = router;
