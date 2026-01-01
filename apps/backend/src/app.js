const express = require("express");
const cors = require("cors");
const session = require("express-session");

const passport = require("./modules/auth/googleAuth");

const authRoutes = require("./modules/auth/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(session({ secret: "some_secret", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => res.json({ status: "OK", app: "DokanX" }));

// Google OAuth routes
app.get(
  "/api/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Successful login
    res.redirect("/"); // later redirect to frontend dashboard
  }
);

module.exports = app;
