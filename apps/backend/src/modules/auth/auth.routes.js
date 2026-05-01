const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const otpController = require("./otp.controller");
const passport = require("passport"); 
const { protect } = require("../../middlewares");
const { validateRequest } = require("../../middlewares/validateRequest.middleware");
const { schemas } = require("../../validation/security.schemas");

// load strategy
require("./googleAuth"); 
if (process.env.GOOGLE_CLIENT_ID) {
  router.get("/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );
}

// Register & Login
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/invitations/accept", authController.acceptInvitation);
router.post("/otp/challenge", protect, validateRequest(schemas.sensitiveOtpChallenge), otpController.requestSensitiveOtp);
router.post("/password/forgot", validateRequest(schemas.passwordResetRequest), authController.requestPasswordReset);
router.post("/password/reset", validateRequest(schemas.passwordResetConfirm), authController.resetPasswordWithOtp);

module.exports = router;
