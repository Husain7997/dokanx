const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!password || (!email && !phone))
      return res
        .status(400)
        .json({ message: "Email or Phone & Password required" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      password: hashed,
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "User already exists" });
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (!user)
      return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};
