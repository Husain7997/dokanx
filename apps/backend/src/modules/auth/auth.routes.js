const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const passport = require("passport"); 
const { redisRateLimiter } = require("@/platform/rate-limit/redisRateLimiter");
const { protect } = require("@/middlewares");

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
router.post(
  "/refresh",
  redisRateLimiter({ scope: "auth.refresh", limit: 20, windowSec: 60 }),
  authController.refresh
);
router.post(
  "/logout",
  redisRateLimiter({ scope: "auth.logout", limit: 30, windowSec: 60 }),
  authController.logout
);
router.post(
  "/logout-all",
  protect,
  redisRateLimiter({ scope: "auth.logout_all", limit: 10, windowSec: 60 }),
  authController.logoutAll
);
router.get(
  "/sessions",
  protect,
  redisRateLimiter({ scope: "auth.sessions", limit: 20, windowSec: 60 }),
  authController.listSessions
);
router.delete(
  "/sessions/:sessionId",
  protect,
  redisRateLimiter({ scope: "auth.sessions.revoke", limit: 20, windowSec: 60 }),
  authController.revokeSession
);

module.exports = router;
