const { randomUUID } = require("crypto");

function normalizeAddresses(rows = []) {
  return rows.map((row, index) => ({
    id: String(row.id || randomUUID()),
    label: String(row.label || `Address ${index + 1}`),
    recipient: String(row.recipient || ""),
    phone: String(row.phone || ""),
    line1: String(row.line1 || ""),
    city: String(row.city || ""),
    isDefault: Boolean(row.isDefault || index === 0),
  }));
}

function normalizePaymentMethods(rows = []) {
  return rows.map((row, index) => ({
    id: String(row.id || randomUUID()),
    label: String(row.label || `Method ${index + 1}`),
    provider: String(row.provider || ""),
    accountRef: String(row.accountRef || ""),
    isDefault: Boolean(row.isDefault || index === 0),
  }));
}

exports.getMe = async (req, res) => {
  const user = req.user?.toObject ? req.user.toObject() : req.user;

  res.json({
    success: true,
    user,
    shopId: req.shop || null,
    lang: req.lang,
  });
};

exports.updatePreferences = async (req, res) => {
  const payload = req.body || {};
  const addresses = normalizeAddresses(Array.isArray(payload.addresses) ? payload.addresses : []);
  const savedPaymentMethods = normalizePaymentMethods(
    Array.isArray(payload.savedPaymentMethods) ? payload.savedPaymentMethods : []
  );

  req.user.addresses = addresses.map((row, index) => ({
    ...row,
    isDefault: index === 0 ? true : Boolean(row.isDefault),
  }));
  req.user.savedPaymentMethods = savedPaymentMethods.map((row, index) => ({
    ...row,
    isDefault: index === 0 ? true : Boolean(row.isDefault),
  }));

  await req.user.save();

  res.json({
    success: true,
    message: "Preferences updated",
    user: req.user,
  });
};
