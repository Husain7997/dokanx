exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
    shopId: req.shop || null,
    lang: req.lang
  });
};