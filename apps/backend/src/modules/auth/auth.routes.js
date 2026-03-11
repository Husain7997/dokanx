const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const passport = require("passport"); 
const { redisRateLimiter } = require("@/platform/rate-limit/redisRateLimiter");
const { protect } = require("@/middlewares");
const { validateBody } = require("@/middlewares/validateRequest");
const authValidator = require("./auth.validator");

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
  validateBody(authValidator.validateRegisterBody),
  authController.register
);
router.post(
  "/login",
  redisRateLimiter({ scope: "auth.login", limit: 10, windowSec: 60 }),
  validateBody(authValidator.validateLoginBody),
  authController.login
);
router.post(
  "/otp/request",
  redisRateLimiter({ scope: "auth.otp.request", limit: 5, windowSec: 60 }),
  validateBody(authValidator.validateOtpRequestBody),
  authController.requestOtp
);
router.post(
  "/otp/verify",
  redisRateLimiter({ scope: "auth.otp.verify", limit: 10, windowSec: 60 }),
  validateBody(authValidator.validateOtpVerifyBody),
  authController.verifyOtp
);
router.post(
  "/magic-link/request",
  redisRateLimiter({ scope: "auth.magic.request", limit: 5, windowSec: 60 }),
  validateBody(authValidator.validateMagicLinkRequestBody),
  authController.requestMagicLink
);
router.post(
  "/magic-link/verify",
  redisRateLimiter({ scope: "auth.magic.verify", limit: 10, windowSec: 60 }),
  validateBody(authValidator.validateMagicLinkVerifyBody),
  authController.verifyMagicLink
);
router.post(
  "/refresh",
  redisRateLimiter({ scope: "auth.refresh", limit: 20, windowSec: 60 }),
  validateBody(authValidator.validateRefreshBody),
  authController.refresh
);
router.post(
  "/logout",
  redisRateLimiter({ scope: "auth.logout", limit: 30, windowSec: 60 }),
  validateBody(authValidator.validateLogoutBody),
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
