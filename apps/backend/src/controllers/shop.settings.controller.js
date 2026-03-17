const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const Shop = require("../models/shop.model");
const User = require("../models/user.model");

async function resolveShop(req) {
  if (req.shop) return req.shop;
  if (req.user?.shopId) {
    return Shop.findById(req.user.shopId);
  }
  return null;
}

function createInviteToken() {
  return randomUUID();
}

function invitePayload(token) {
  return {
    inviteUrl: token ? `/invitations/accept?token=${token}` : null,
    expiresAt: token ? new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() : null,
    emailSent: false,
  };
}

exports.getShopSettings = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  res.json({
    data: {
      name: shop.name,
      supportEmail: shop.supportEmail || "",
      whatsapp: shop.whatsapp || "",
      payoutSchedule: shop.payoutSchedule || "",
      logoUrl: shop.logoUrl || "",
      brandPrimaryColor: shop.brandPrimaryColor || "",
      brandAccentColor: shop.brandAccentColor || "",
      storefrontDomain: shop.storefrontDomain || "",
      addressLine1: shop.addressLine1 || "",
      addressLine2: shop.addressLine2 || "",
      city: shop.city || "",
      country: shop.country || "",
      vatRate: shop.vatRate ?? 0,
      defaultDiscountRate: shop.defaultDiscountRate ?? 0,
    },
  });
};

exports.updateShopSettings = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const {
    name,
    supportEmail,
    whatsapp,
    payoutSchedule,
    logoUrl,
    brandPrimaryColor,
    brandAccentColor,
    storefrontDomain,
    addressLine1,
    addressLine2,
    city,
    country,
    vatRate,
    defaultDiscountRate,
  } = req.body || {};

  shop.name = name ?? shop.name;
  shop.supportEmail = supportEmail ?? shop.supportEmail;
  shop.whatsapp = whatsapp ?? shop.whatsapp;
  shop.payoutSchedule = payoutSchedule ?? shop.payoutSchedule;
  shop.logoUrl = logoUrl ?? shop.logoUrl;
  shop.brandPrimaryColor = brandPrimaryColor ?? shop.brandPrimaryColor;
  shop.brandAccentColor = brandAccentColor ?? shop.brandAccentColor;
  shop.storefrontDomain = storefrontDomain ?? shop.storefrontDomain;
  shop.addressLine1 = addressLine1 ?? shop.addressLine1;
  shop.addressLine2 = addressLine2 ?? shop.addressLine2;
  shop.city = city ?? shop.city;
  shop.country = country ?? shop.country;
  if (vatRate !== undefined) shop.vatRate = Number(vatRate) || 0;
  if (defaultDiscountRate !== undefined) shop.defaultDiscountRate = Number(defaultDiscountRate) || 0;

  await shop.save();

  res.json({
    message: "Shop settings updated",
    data: {
      name: shop.name,
      supportEmail: shop.supportEmail,
      whatsapp: shop.whatsapp,
      payoutSchedule: shop.payoutSchedule,
      logoUrl: shop.logoUrl,
      brandPrimaryColor: shop.brandPrimaryColor,
      brandAccentColor: shop.brandAccentColor,
      storefrontDomain: shop.storefrontDomain || "",
      addressLine1: shop.addressLine1,
      addressLine2: shop.addressLine2,
      city: shop.city,
      country: shop.country,
      vatRate: shop.vatRate ?? 0,
      defaultDiscountRate: shop.defaultDiscountRate ?? 0,
    },
  });
};

exports.listTeamMembers = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const members = await User.find({ shopId: shop._id, role: { $in: ["OWNER", "STAFF"] } })
    .select("name email role permissionOverrides phone")
    .lean();

  res.json({ data: members });
};

exports.addTeamMember = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const { name, email, phone, role, permissions } = req.body || {};
  if (!email) return res.status(400).json({ message: "Email is required" });

  const normalizedRole = String(role || "STAFF").toUpperCase();
  const inviteToken = createInviteToken();

  const existing = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
  if (existing) {
    if (existing.shopId && String(existing.shopId) !== String(shop._id)) {
      return res.status(409).json({ message: "User belongs to another shop" });
    }

    existing.shopId = shop._id;
    existing.role = normalizedRole;
    existing.permissionOverrides = Array.isArray(permissions) ? permissions : [];
    existing.phone = phone ?? existing.phone;
    existing.name = name ?? existing.name;
    existing.invitationToken = inviteToken;
    existing.invitationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await existing.save();

    return res.json({
      message: "Team member updated",
      invite: invitePayload(inviteToken),
      data: existing,
    });
  }

  const tempPassword = randomUUID();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const member = await User.create({
    name: name || "New team member",
    email: String(email).toLowerCase(),
    phone: phone || null,
    password: hashedPassword,
    role: normalizedRole,
    shopId: shop._id,
    permissionOverrides: Array.isArray(permissions) ? permissions : [],
    invitationToken: inviteToken,
    invitationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  });

  res.status(201).json({
    message: "Team member invited",
    invite: invitePayload(inviteToken),
    data: member,
  });
};

exports.updateTeamMember = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const { userId } = req.params;
  const { role, permissions, resendInvite } = req.body || {};

  const member = await User.findOne({ _id: userId, shopId: shop._id });
  if (!member) return res.status(404).json({ message: "Team member not found" });

  if (role) member.role = String(role).toUpperCase();
  if (Array.isArray(permissions)) member.permissionOverrides = permissions;

  let inviteToken = null;
  if (resendInvite) {
    inviteToken = createInviteToken();
    member.invitationToken = inviteToken;
    member.invitationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  }

  await member.save();

  res.json({
    message: "Team member updated",
    invite: inviteToken ? invitePayload(inviteToken) : undefined,
    data: member,
  });
};
