const CustomerIdentity = require("./customer.identity.model");

async function findOrCreateCustomer({ shopId = null, phone, name = "" }) {
  let customer = null;

  if (shopId) {
    customer = await CustomerIdentity.findOne({ shopId, phone });
  } else {
    customer = await CustomerIdentity.findOne({ phone, shopId: null });
  }

  if (!customer) {
    const legacyCustomer = shopId
      ? await CustomerIdentity.findOne({
          phone,
          $or: [{ shopId: null }, { shopId: { $exists: false } }],
        })
      : null;

    customer = await CustomerIdentity.create({
      shopId,
      phone,
      name: name || legacyCustomer?.name || "",
      globalCreditScore: legacyCustomer?.globalCreditScore || 0,
      riskLevel: legacyCustomer?.riskLevel || "LOW",
      metadata: legacyCustomer?.metadata || {},
    });
  }

  return customer;
}

module.exports = {
  findOrCreateCustomer,
};
