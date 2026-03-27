const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const Shop = require("../models/shop.model");
const User = require("../models/user.model");

const DEFAULT_MERCHANT_FEATURES = {
  posScannerEnabled: true,
  cameraScannerEnabled: true,
  bluetoothScannerEnabled: true,
  productSearchEnabled: true,
  discountToolsEnabled: true,
  pricingSafetyEnabled: true,
  splitPaymentEnabled: true,
};

const DEFAULT_PRICING_SAFETY = {
  greenMinMarginPct: 0,
  limeMinMarginPct: -2,
  yellowMinMarginPct: -5,
  orangeMinMarginPct: -10,
  redBelowCost: true,
};

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

function normalizeMerchantFeatures(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    posScannerEnabled: source.posScannerEnabled !== false,
    cameraScannerEnabled: source.cameraScannerEnabled !== false,
    bluetoothScannerEnabled: source.bluetoothScannerEnabled !== false,
    productSearchEnabled: source.productSearchEnabled !== false,
    discountToolsEnabled: source.discountToolsEnabled !== false,
    pricingSafetyEnabled: source.pricingSafetyEnabled !== false,
    splitPaymentEnabled: source.splitPaymentEnabled !== false,
  };
}

function normalizePricingSafety(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    greenMinMarginPct: Number(source.greenMinMarginPct ?? DEFAULT_PRICING_SAFETY.greenMinMarginPct),
    limeMinMarginPct: Number(source.limeMinMarginPct ?? DEFAULT_PRICING_SAFETY.limeMinMarginPct),
    yellowMinMarginPct: Number(source.yellowMinMarginPct ?? DEFAULT_PRICING_SAFETY.yellowMinMarginPct),
    orangeMinMarginPct: Number(source.orangeMinMarginPct ?? DEFAULT_PRICING_SAFETY.orangeMinMarginPct),
    redBelowCost: source.redBelowCost !== false,
  };
}

function buildSettingsPayload(shop) {
  return {
    name: shop.name,
    supportEmail: shop.supportEmail || "",
    whatsapp: shop.whatsapp || "",
    payoutSchedule: shop.payoutSchedule || "",
    settlementFrequency: shop.settlementFrequency || "",
    settlementDelayDays: shop.settlementDelayDays ?? 0,
    settlementNotes: shop.settlementNotes || "",
    settlementBankName: shop.settlementBankName || "",
    settlementAccountName: shop.settlementAccountName || "",
    settlementAccountNumber: shop.settlementAccountNumber || "",
    settlementRoutingNumber: shop.settlementRoutingNumber || "",
    settlementBranchName: shop.settlementBranchName || "",
    preferredBankGateway: shop.preferredBankGateway || "",
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
    commissionRate: shop.commissionRate ?? 0,
    merchantFeatures: normalizeMerchantFeatures(shop.merchantFeatures || DEFAULT_MERCHANT_FEATURES),
    pricingSafety: normalizePricingSafety(shop.pricingSafety || DEFAULT_PRICING_SAFETY),
    kyc: {
      status: shop.kycStatus || "NOT_SUBMITTED",
      submittedAt: shop.kycSubmittedAt || null,
      approvedAt: shop.kycApprovedAt || null,
      rejectedAt: shop.kycRejectedAt || null,
      rejectionReason: shop.kycRejectionReason || "",
      profilePhotoUrl: shop.kycProfilePhotoUrl || "",
      nationalIdNumber: shop.kycNationalIdNumber || "",
      nationalIdFrontUrl: shop.kycNationalIdFrontUrl || "",
      nationalIdBackUrl: shop.kycNationalIdBackUrl || "",
      tradeLicenseNumber: shop.kycTradeLicenseNumber || "",
      tradeLicenseUrl: shop.kycTradeLicenseUrl || "",
    },
  };
}

exports.getShopSettings = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  res.json({ data: buildSettingsPayload(shop) });
};

exports.updateShopSettings = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const {
    name,
    supportEmail,
    whatsapp,
    payoutSchedule,
    settlementFrequency,
    settlementDelayDays,
    settlementNotes,
    settlementBankName,
    settlementAccountName,
    settlementAccountNumber,
    settlementRoutingNumber,
    settlementBranchName,
    preferredBankGateway,
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
    commissionRate,
    merchantFeatures,
    pricingSafety,
    kyc,
  } = req.body || {};

  shop.name = name ?? shop.name;
  shop.supportEmail = supportEmail ?? shop.supportEmail;
  shop.whatsapp = whatsapp ?? shop.whatsapp;
  shop.payoutSchedule = payoutSchedule ?? shop.payoutSchedule;
  shop.settlementFrequency = settlementFrequency ?? shop.settlementFrequency;
  if (settlementDelayDays !== undefined) shop.settlementDelayDays = Math.max(0, Number(settlementDelayDays) || 0);
  shop.settlementNotes = settlementNotes ?? shop.settlementNotes;
  shop.settlementBankName = settlementBankName ?? shop.settlementBankName;
  shop.settlementAccountName = settlementAccountName ?? shop.settlementAccountName;
  shop.settlementAccountNumber = settlementAccountNumber ?? shop.settlementAccountNumber;
  shop.settlementRoutingNumber = settlementRoutingNumber ?? shop.settlementRoutingNumber;
  shop.settlementBranchName = settlementBranchName ?? shop.settlementBranchName;
  shop.preferredBankGateway = preferredBankGateway ?? shop.preferredBankGateway;
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
  if (commissionRate !== undefined) shop.commissionRate = Number(commissionRate) || 0;
  if (merchantFeatures !== undefined) shop.merchantFeatures = normalizeMerchantFeatures(merchantFeatures);
  if (pricingSafety !== undefined) shop.pricingSafety = normalizePricingSafety(pricingSafety);
  if (kyc && typeof kyc === "object") {
    if (kyc.profilePhotoUrl !== undefined) shop.kycProfilePhotoUrl = kyc.profilePhotoUrl || "";
    if (kyc.nationalIdNumber !== undefined) shop.kycNationalIdNumber = kyc.nationalIdNumber || "";
    if (kyc.nationalIdFrontUrl !== undefined) shop.kycNationalIdFrontUrl = kyc.nationalIdFrontUrl || "";
    if (kyc.nationalIdBackUrl !== undefined) shop.kycNationalIdBackUrl = kyc.nationalIdBackUrl || "";
    if (kyc.tradeLicenseNumber !== undefined) shop.kycTradeLicenseNumber = kyc.tradeLicenseNumber || "";
    if (kyc.tradeLicenseUrl !== undefined) shop.kycTradeLicenseUrl = kyc.tradeLicenseUrl || "";
    if (kyc.submit === true) {
      shop.kycStatus = "PENDING";
      shop.kycSubmittedAt = new Date();
      shop.kycRejectedAt = null;
      shop.kycRejectionReason = "";
    }
  }

  await shop.save();

  res.json({
    message: "Shop settings updated",
    data: buildSettingsPayload(shop),
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

exports.listTeamActivity = async (req, res) => {
  const shop = await resolveShop(req);
  if (!shop) return res.status(404).json({ message: "Shop not found" });

  const members = await User.find({ shopId: shop._id, role: { $in: ["OWNER", "STAFF", "ADMIN"] } })
    .select("_id name role")
    .lean();
  const memberIds = members.map((member) => member._id).filter(Boolean);
  if (!memberIds.length) {
    return res.json({ data: [] });
  }

  const memberMap = new Map(members.map((member) => [String(member._id), member]));
  const activity = await AuditLog.find({ performedBy: { $in: memberIds } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({
    data: activity.map((entry) => {
      const actor = memberMap.get(String(entry.performedBy || ""));
      return {
        id: String(entry._id || ""),
        action: String(entry.action || "ACTION"),
        actorName: String(actor?.name || "Team member"),
        actorRole: String(actor?.role || "STAFF"),
        createdAt: entry.createdAt || null,
        targetType: String(entry.targetType || "System"),
      };
    }),
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

