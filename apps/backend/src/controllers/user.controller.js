const User = require("../models/user.model");
exports.blockUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.isBlocked = true;
  await user.save();

  res.json({
    success: true,
    message: "User blocked"
  });
};

exports.unblockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isBlocked = false;
  await user.save();

  res.json({ success: true });
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};
