const crypto = require("crypto");
const CustomerIdentity = require("./customer.identity.model");

function createGlobalCustomerId() {
  return `cust_${crypto.randomBytes(6).toString("hex")}`;
}

function normalizePhone(phone) {
  return phone ? String(phone).replace(/\D/g, "") : null;
}

async function ensureCustomerIdentityForUser(user) {
  if (!user || user.role !== "CUSTOMER") return null;

  const normalizedPhone = normalizePhone(user.phone);
  let identity = null;

  if (user.customerIdentityId) {
    identity = await CustomerIdentity.findById(user.customerIdentityId);
  }

  if (!identity && normalizedPhone) {
    identity = await CustomerIdentity.findOne({ normalizedPhone });
  }

  if (!identity && normalizedPhone) {
    identity = await CustomerIdentity.create({
      phone: user.phone,
      normalizedPhone,
      name: user.name,
      linkedUserId: user._id,
      globalCustomerId: user.globalCustomerId || createGlobalCustomerId(),
      metadata: { source: "user_sync" },
    });
  }

  if (!identity) return null;

  let changed = false;
  if (!user.globalCustomerId) {
    user.globalCustomerId = identity.globalCustomerId || createGlobalCustomerId();
    changed = true;
  }
  if (!user.customerIdentityId || String(user.customerIdentityId) !== String(identity._id)) {
    user.customerIdentityId = identity._id;
    changed = true;
  }
  if (changed) {
    await user.save();
  }

  const updates = {};
  if (!identity.globalCustomerId && user.globalCustomerId) updates.globalCustomerId = user.globalCustomerId;
  if (!identity.linkedUserId) updates.linkedUserId = user._id;
  if (normalizedPhone && identity.normalizedPhone !== normalizedPhone) updates.normalizedPhone = normalizedPhone;
  if (user.phone && identity.phone !== user.phone) updates.phone = user.phone;
  if (user.name && identity.name !== user.name) updates.name = user.name;

  if (Object.keys(updates).length) {
    await CustomerIdentity.findByIdAndUpdate(identity._id, { $set: updates }, { new: true });
    return { ...identity.toObject(), ...updates };
  }

  return identity;
}

module.exports = {
  createGlobalCustomerId,
  ensureCustomerIdentityForUser,
  normalizePhone,
};
