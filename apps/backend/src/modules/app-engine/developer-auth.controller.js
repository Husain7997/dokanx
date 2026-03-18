const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../../models/user.model");
const Developer = require("../../models/developer.model");

async function ensureDeveloperProfile(userId) {
  let developer = await Developer.findOne({ userId });
  if (!developer) {
    developer = await Developer.create({ userId });
  }
  return developer;
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, organizationName, website } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role: "DEVELOPER",
    });

    const developer = await ensureDeveloperProfile(user._id);
    if (organizationName || website) {
      developer.organizationName = organizationName || developer.organizationName;
      developer.website = website || developer.website;
      await developer.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, shopId: user.shopId || null },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Developer account created",
      token,
      data: developer,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: String(email).toLowerCase(), role: "DEVELOPER" }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid developer credentials" });
    }

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) {
      return res.status(401).json({ message: "Invalid developer credentials" });
    }

    const developer = await ensureDeveloperProfile(user._id);
    const token = jwt.sign(
      { id: user._id, role: user.role, shopId: user.shopId || null },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      data: developer,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
