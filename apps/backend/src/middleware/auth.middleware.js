const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
      return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user)
      return res.status(401).json({ message: 'User not found' });

    req.user = {
      userId: user._id,
      role: user.role
    };

    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
