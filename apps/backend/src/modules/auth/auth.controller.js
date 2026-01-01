const User = require("./user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

// ===== Register =====
exports.register = async (req, res) => {
  try {
    const { email, phone, password, name } = req.body;

    if (!password || (!email && !phone))
      return res.status(400).json({ msg: "Email or Phone & Password required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email: email || undefined,
      phone: phone || undefined,
      password: hashedPassword,
      name,
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ msg: "User already exists" });
    } else {
      res.status(500).json({ msg: err.message });
    }
  }
};

// ===== Login =====
exports.login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!password || (!email && !phone))
      return res.status(400).json({ msg: "Email or Phone & Password required" });

    const user = await User.findOne({ $or: [{ email }, { phone }] });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
