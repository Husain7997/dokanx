const User = require("../../models/user.model");
const bcrypt = require("bcryptjs");
const generateToken = require("../../utils/generateToken");
const { t } = require("@/core/infrastructure");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { ensureCustomerIdentityForUser } = require("../customer/customer.identity.service");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").trim();
}

function validateRegisterInput(body = {}) {
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const password = String(body.password || "");
  const role = String(body.role || "CUSTOMER").trim().toUpperCase() || "CUSTOMER";

  if (!name || name.length < 2) {
    return { error: "Name must be at least 2 characters", status: 400 };
  }

  if (!email && !phone) {
    return { error: "Email or phone is required", status: 400 };
  }

  if (!email) {
    return { error: "Email is required", status: 400 };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { error: "Valid email is required", status: 400 };
  }

  if (phone) {
    const phonePattern = /^\+?[0-9\-()\s]{8,20}$/;
    if (!phonePattern.test(phone)) {
      return { error: "Valid phone number is required", status: 400 };
    }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters", status: 400 };
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: "Password must include letters and numbers", status: 400 };
  }

  return {
    value: {
      name,
      email,
      phone: phone || null,
      password,
      role,
    },
  };
}

exports.register = async (req, res) => {
  try {
    const validation = validateRegisterInput(req.body || {});
    if (validation.error) {
      return res.status(validation.status || 400).json({
        success: false,
        message: validation.error,
      });
    }

    const { name, email, phone, password, role } = validation.value;

    const existingConditions = [{ email }];
    if (phone) {
      existingConditions.push({ phone });
    }

    const existing = await User.findOne({ $or: existingConditions });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.email === email ? t("auth.user_exists") : "Phone already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      shopId: null,
    });
    await ensureCustomerIdentityForUser(user);

    const token = generateToken(user);

    res.status(201).json({
      message: t("common.updated", req.lang),
      token,
      user,
    });
  } catch (err) {
    console.error("AUTH_REGISTER_FAILED", {
      error: err?.message || String(err),
      stack: err?.stack || null,
      bodyKeys: Object.keys(req.body || {}),
    });
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user)
    return res.status(401).json({
      message: "Invalid credentials",
    });

  const match = await bcrypt.compare(password, user.password);

  if (!match)
    return res.status(401).json({
      message: "Invalid credentials",
    });

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      shopId: user.shopId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shopId: user.shopId || null,
    },
  });
  await ensureCustomerIdentityForUser(user);
};

exports.acceptInvitation = async (req, res) => {
  try {
    const { token, password, name } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    const user = await User.findOne({
      invitationToken: token,
      invitationExpiresAt: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      return res.status(404).json({ message: "Invitation not found or expired" });
    }

    user.password = await bcrypt.hash(password, 10);
    if (name) user.name = name;
    user.invitationToken = null;
    user.invitationExpiresAt = null;
    await user.save();
    await ensureCustomerIdentityForUser(user);

    const accessToken = jwt.sign(
      { id: user._id, role: user.role, shopId: user.shopId || null },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Invitation accepted",
      token: accessToken,
      user,
      inviteId: randomUUID(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
