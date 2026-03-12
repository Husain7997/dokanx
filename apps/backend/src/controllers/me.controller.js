exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
    shopId: req.shop || null,
    lang: req.lang
  });
};

exports.updatePreferences = async (req, res) => {
  req.user.addresses = Array.isArray(req.body?.addresses) ? req.body.addresses : req.user.addresses || [];
  req.user.savedPaymentMethods = Array.isArray(req.body?.savedPaymentMethods)
    ? req.body.savedPaymentMethods
    : req.user.savedPaymentMethods || [];

  await req.user.save();

  res.json({
    success: true,
    message: "Preferences updated",
    user: req.user,
  });
};
