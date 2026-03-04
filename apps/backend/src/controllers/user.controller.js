const User = require("../models/user.model");
const { createAudit } = require("../utils/audit.util");
const { t } =
  require('@/core/infrastructure');
exports.blockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  

  // const t = req.t;

if (!user)
  return res.status(404).json({
    msg: t("USER_NOT_FOUND"),
  });

  user.isBlocked = true;
  await user.save();

  res.json({
    message: t('common.updated', req.lang),    
  });
};

exports.unblockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isBlocked = false;
  await user.save();

  res.json({ message: t('common.updated', req.lang) });
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      message: t('common.updated', req.lang),
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};
