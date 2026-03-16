const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const passport = require("passport"); 

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
router.post("/invitations/accept", authController.acceptInvitation);

module.exports = router;
