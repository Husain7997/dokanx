const bcrypt = require("bcryptjs");

const User = require("../../models/user.model");
const Shop = require("../../models/shop.model");
const Notification = require("../../models/notification.model");
const Agent = require("./agent.model");
const AgentLead = require("./agentLead.model");
const AgentReferralEvent = require("./agentReferralEvent.model");
const { sendSms } = require("../../infrastructure/notifications/sms.provider");

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "").trim();
}

function createFallbackEmail(phone) {
  const digits = normalizePhone(phone).replace(/[^\d]/g, "") || `${Date.now()}`;
  return `agent.${digits}@dokanx.local`;
}

function createTemporaryPassword(phone) {
  const digits = normalizePhone(phone).replace(/[^\d]/g, "");
  const suffix = digits.slice(-6) || Math.random().toString(36).slice(2, 8);
  return `DxAgent!${suffix}`;
}

function buildCandidateCode(name, phone) {
  const prefix =
    String(name || "AGENT").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) ||
    "AGT";
  const digits = normalizePhone(phone).replace(/[^\d]/g, "").slice(-4) || "0000";
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}${digits}${random}`;
}

async function generateUniqueAgentCode(name, phone) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = buildCandidateCode(name, phone);
    // eslint-disable-next-line no-await-in-loop
    const exists = await Agent.exists({ agentCode: code });
    if (!exists) return code;
  }
  return `AGT${Date.now().toString(36).toUpperCase()}`;
}

function buildReferralLink(agentCode) {
  const base = process.env.AGENT_JOIN_BASE_URL || "https://dokanx.com/join";
  return `${base.replace(/\/$/, "")}?ref=${encodeURIComponent(agentCode)}`;
}

async function createNotification(userId, title, message, metadata = null) {
  if (!userId) return null;
  return Notification.create({
    userId,
    title,
    message,
    type: "AGENT",
    metadata,
  });
}

async function sendAccountCreatedMessage({ user, agent, password }) {
  const referralLink = buildReferralLink(agent.agentCode);
  const smsBody =
    `DokanX agent account ready. Email: ${user.email}. Password: ${password}. ` +
    `Referral: ${referralLink}`;

  await Promise.all([
    createNotification(
      user._id,
      "Agent account created",
      `Your DokanX agent account is active. Referral link: ${referralLink}`,
      { agentCode: agent.agentCode, referralLink }
    ),
    sendSms(user.phone, smsBody),
  ]);
}

async function sendShopPaymentAlert(agent, shop, amount) {
  await Promise.all([
    createNotification(
      agent.userId,
      "Shop payment alert",
      `${shop.name || "A referred shop"} received a payment of ${Number(amount || 0).toFixed(2)} BDT.`,
      { shopId: shop._id, amount }
    ),
    sendSms(
      agent.phone,
      `${shop.name || "A referred shop"} received a payment of ${Number(amount || 0).toFixed(2)} BDT.`
    ),
  ]);
}

async function sendFirstEarningAlert(agent, amount, shop) {
  await Promise.all([
    createNotification(
      agent.userId,
      "First earning unlocked",
      `You earned ${Number(amount || 0).toFixed(2)} BDT from ${shop.name || "your referred shop"}.`,
      { shopId: shop._id, amount }
    ),
    sendSms(
      agent.phone,
      `Congrats. You earned ${Number(amount || 0).toFixed(2)} BDT from ${shop.name || "your referred shop"}.`
    ),
  ]);
}

async function registerFromLead(payload = {}) {
  const name = String(payload.name || "").trim();
  const phone = normalizePhone(payload.phone);
  const district = String(payload.district || "").trim();
  const experience = String(payload.experience || "").trim();
  const source = String(payload.source || "facebook").trim();

  if (!name || !phone || !district) {
    throw new Error("name, phone, and district are required");
  }

  const fallbackEmail = createFallbackEmail(phone);
  const existingUser = await User.findOne({
    $or: [{ phone }, { email: fallbackEmail }],
  }).lean();
  if (existingUser) {
    throw new Error("Lead already converted into an account");
  }

  const lead = await AgentLead.create({
    name,
    phone,
    district,
    experience,
    source,
    metadata: payload.metadata || null,
  });

  const password = createTemporaryPassword(phone);
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: fallbackEmail,
    phone,
    password: hashedPassword,
    role: "AGENT",
    shopId: null,
  });

  try {
    const agent = await Agent.create({
      userId: user._id,
      agentCode: await generateUniqueAgentCode(name, phone),
      phone,
      district,
      experience,
      status: "ACTIVE",
    });

    lead.status = "CONVERTED";
    lead.userId = user._id;
    lead.agentId = agent._id;
    await lead.save();

    await sendAccountCreatedMessage({ user, agent, password });

    return {
      lead: lead.toObject(),
      agent: {
        ...agent.toObject(),
        referralLink: buildReferralLink(agent.agentCode),
      },
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      tempPassword: password,
    };
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    await AgentLead.findByIdAndUpdate(lead._id, { status: "REJECTED" });
    throw error;
  }
}

async function resolveAgentByCode(agentCode) {
  if (!agentCode) return null;
  return Agent.findOne({
    agentCode: String(agentCode).trim().toUpperCase(),
    status: { $ne: "BANNED" },
  });
}

async function trackReferralClick({ agentCode, metadata = null }) {
  const agent = await resolveAgentByCode(agentCode);
  if (!agent) {
    throw new Error("Agent referral not found");
  }

  await Agent.updateOne({ _id: agent._id }, { $inc: { clickCount: 1 } });
  await AgentReferralEvent.create({
    agentId: agent._id,
    eventType: "CLICK",
    agentCode: agent.agentCode,
    metadata,
  });

  return {
    agentCode: agent.agentCode,
    status: agent.status,
    referralLink: buildReferralLink(agent.agentCode),
  };
}

async function attachAgentToShop({ shopId, agentCode }) {
  const agent = await resolveAgentByCode(agentCode);
  if (!agent || !shopId) {
    return null;
  }

  const shop = await Shop.findByIdAndUpdate(
    shopId,
    {
      agentId: agent._id,
      acquisitionSource: "agent",
    },
    { returnDocument: "after" }
  );

  if (!shop) return null;

  await Agent.findByIdAndUpdate(agent._id, {
    $addToSet: { referredShops: shop._id },
    $inc: { signupCount: 1, shopConversionCount: 1 },
  });

  await AgentReferralEvent.create({
    agentId: agent._id,
    eventType: "SHOP_CONVERSION",
    agentCode: agent.agentCode,
    userId: shop.owner,
    shopId: shop._id,
    metadata: { shopName: shop.name },
  });

  return shop;
}

async function getAgentMe(userId) {
  const agent = await Agent.findOne({ userId }).lean();
  if (!agent) return null;

  return {
    ...agent,
    totalShops: Array.isArray(agent.referredShops) ? agent.referredShops.length : 0,
    referralLink: buildReferralLink(agent.agentCode),
  };
}

async function listAdminAgents() {
  const agents = await Agent.find()
    .populate("userId", "name email phone isBlocked")
    .sort({ createdAt: -1 })
    .lean();

  return agents.map((agent) => ({
    ...agent,
    totalShops: Array.isArray(agent.referredShops) ? agent.referredShops.length : 0,
    referralLink: buildReferralLink(agent.agentCode),
  }));
}

async function updateAgentStatus(agentId, status) {
  const normalizedStatus = String(status || "").toUpperCase();
  if (!["ACTIVE", "BANNED", "PENDING"].includes(normalizedStatus)) {
    throw new Error("Invalid agent status");
  }

  const agent = await Agent.findByIdAndUpdate(
    agentId,
    { status: normalizedStatus },
    { returnDocument: "after" }
  )
    .populate("userId", "name email phone")
    .lean();

  if (!agent) {
    throw new Error("Agent not found");
  }

  await createNotification(
    agent.userId?._id || agent.userId,
    `Agent status: ${normalizedStatus}`,
    `Your DokanX agent account is now ${normalizedStatus.toLowerCase()}.`,
    { status: normalizedStatus }
  );

  return {
    ...agent,
    totalShops: Array.isArray(agent.referredShops) ? agent.referredShops.length : 0,
    referralLink: buildReferralLink(agent.agentCode),
  };
}

async function handleSuccessfulShopPayment({ shopId, amount, orderId = null }) {
  if (!shopId) return null;

  const shop = await Shop.findById(shopId).lean();
  if (!shop?.agentId) return null;

  const agent = await Agent.findById(shop.agentId).lean();
  if (!agent || agent.status === "BANNED") return null;

  await AgentReferralEvent.create({
    agentId: agent._id,
    eventType: "SHOP_PAYMENT_ALERT",
    agentCode: agent.agentCode,
    shopId: shop._id,
    metadata: { amount, orderId },
  });
  await sendShopPaymentAlert(agent, shop, amount);

  if (shop.agentFirstPaymentAt) {
    return { rewarded: false };
  }

  const firstEarning = Number(process.env.AGENT_FIRST_EARNING_BONUS || 500);

  await Shop.findByIdAndUpdate(shop._id, { agentFirstPaymentAt: new Date() });
  await Agent.findByIdAndUpdate(agent._id, {
    $inc: {
      availableBalance: firstEarning,
      totalEarnings: firstEarning,
      lifetimeCommission: firstEarning,
    },
  });
  await AgentReferralEvent.create({
    agentId: agent._id,
    eventType: "FIRST_EARNING",
    agentCode: agent.agentCode,
    shopId: shop._id,
    metadata: { amount: firstEarning, orderId },
  });
  await sendFirstEarningAlert(agent, firstEarning, shop);

  return { rewarded: true, amount: firstEarning };
}

module.exports = {
  attachAgentToShop,
  buildReferralLink,
  getAgentMe,
  handleSuccessfulShopPayment,
  listAdminAgents,
  registerFromLead,
  resolveAgentByCode,
  trackReferralClick,
  updateAgentStatus,
};

