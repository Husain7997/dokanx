const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const passport = require("passport"); 
const { redisRateLimiter } = require("@/platform/rate-limit/redisRateLimiter");

// load strategy
require("./googleAuth"); 
if (process.env.GOOGLE_CLIENT_ID) {
  router.get("/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );
}

// Register & Login
router.post(
  "/register",
  redisRateLimiter({ scope: "auth.register", limit: 20, windowSec: 60 }),
  authController.register
);
router.post(
  "/login",
  redisRateLimiter({ scope: "auth.login", limit: 10, windowSec: 60 }),
  authController.login
);

module.exports = router;
