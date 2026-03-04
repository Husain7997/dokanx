const router = require("express").Router();
const {protect} = require("../middlewares");

const { getMe } = require("../controllers/me.controller");

router.get("/me", protect, getMe);

module.exports = router;