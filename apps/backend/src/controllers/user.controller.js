const User = require("../models/user.model");
const { logger } = require("@/core/infrastructure");
const response = require("@/utils/controllerResponse");

exports.blockUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return response.notFound(res, "User");
  }

  user.isBlocked = true;
  await user.save();

  return response.updated(res, req, undefined);
};

exports.unblockUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return response.notFound(res, "User");
  }

  user.isBlocked = false;
  await user.save();

  return response.updated(res, req, undefined);
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    response.updated(res, req, users);
  } catch (error) {
    logger.error({ err: error.message }, "Failed to fetch users");
    response.failure(res, "Failed to fetch users", 500);
  }
};
