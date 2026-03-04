const User = require("../../models/user.model");
const bcrypt = require("bcryptjs");
const generateToken = require("../../utils/generateToken");
const { t } =
  require('@/core/infrastructure');
const jwt = require("jsonwebtoken");
/**
 * ===============================
 * REGISTER
 * ===============================
 */
exports.register = async (req, res) => {
  try {
    
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({
        message: t("auth.user_exists"),
      });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role?.toUpperCase() || "CUSTOMER",
      shopId: null,
    });

    const token = generateToken(user);

    res.status(201).json({
      message: t('common.updated', req.lang),
      token,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ===============================
 * LOGIN
 * ===============================
 */

exports.login = async (req, res) => {
  const { email, password } = req.body;

  // 1️⃣ find user WITH password
  const user = await User
    .findOne({ email })
    .select("+password");

  if (!user)
    return res.status(401).json({
      message: "Invalid credentials",
    });

  // 2️⃣ compare password
  const match = await bcrypt.compare(
    password,
    user.password
  );

  if (!match)
    return res.status(401).json({
      message: "Invalid credentials",
    });

  // 3️⃣ generate token
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
  });
};