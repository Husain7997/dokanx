const User = require('../models/user.model');

exports.getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

exports.updateUserRole = async (req, res) => {
  const { role } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  );

  res.json(user);
};
