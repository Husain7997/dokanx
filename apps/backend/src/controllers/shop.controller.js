const Shop = require("../models/shop.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { createAudit } = require("../utils/audit.util");
const { logger } = require("@/core/infrastructure");
const mailer = require("../infrastructure/mail/mail.service");
const response = require("@/utils/controllerResponse");

async function loadOwnedShop(req) {
  const shopId = req.shop?._id || req.user?.shopId || null;
  if (!shopId) return null;

  const shop = await Shop.findById(shopId);
  if (!shop) return null;
  return shop;
}

function issueInvite(req) {
  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const origin =
    String(req.headers.origin || "").trim() ||
    String(req.headers.referer || "").trim().replace(/\/$/, "") ||
    "http://localhost:3001";

  return {
    token,
    tokenHash,
    expiresAt,
    inviteUrl: `${origin.replace(/\/$/, "")}/accept-invite?token=${encodeURIComponent(token)}`,
  };
}

async function sendInviteEmail({ email, name, inviteUrl }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return false;
  }

  const subject = "DokanX team invitation";
  const html = `
    <p>Hello ${name || "team member"},</p>
    <p>You have been invited to join a DokanX merchant workspace.</p>
    <p>Accept your invite:</p>
    <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    <p>This link expires in 7 days.</p>
  `;

  await mailer.send(email, subject, html);
  return true;
}

exports.createShop = async (req, res) => {
  try {
    if (req.user.shopId) {
      return response.failure(res, "User already owns a shop", 400);
    }

    const shop = await Shop.create({
      name: req.body.name,
      currency: req.body.currency,
      timezone: req.body.timezone,
      locale: req.body.locale,
      owner: req.user._id,
      isActive: true,
      status: "ACTIVE",
    });

    await User.findByIdAndUpdate(req.user._id, { shopId: shop._id });
    req.user.shopId = shop._id;
    await req.user.save();

    await createAudit({
      action: "CREATE_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req,
    });

    return response.success(res, {
      shop,
    }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create shop failed");
    return response.failure(res, err.message, 500);
  }
};

exports.updateMyShopSettings = async (req, res) => {
  try {
    const shop = await loadOwnedShop(req);
    if (!shop) {
      return response.failure(res, "Shop context missing", 400);
    }

    if (String(shop.owner) !== String(req.user._id)) {
      return response.failure(res, "Not your shop", 403);
    }

    shop.name = String(req.body.name || "").trim();
    shop.supportEmail = String(req.body.supportEmail || "").trim().toLowerCase();
    shop.whatsapp = String(req.body.whatsapp || "").trim();
    shop.payoutSchedule = String(req.body.payoutSchedule || "").trim();
    if (req.body.logoUrl !== undefined) {
      shop.logoUrl = String(req.body.logoUrl || "").trim();
    }

    const themeOverrides = { ...(shop.themeOverrides || {}) };
    const tokenOverrides = { ...(themeOverrides.tokens || {}) };
    if (req.body.brandPrimaryColor !== undefined) {
      tokenOverrides.primaryColor = String(req.body.brandPrimaryColor || "").trim();
    }
    if (req.body.brandAccentColor !== undefined) {
      tokenOverrides.accentColor = String(req.body.brandAccentColor || "").trim();
    }
    shop.themeOverrides = {
      ...themeOverrides,
      tokens: tokenOverrides,
    };

    await shop.save();

    await createAudit({
      action: "UPDATE_SHOP_SETTINGS",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req,
    });

    return response.updated(res, req, shop);
  } catch (err) {
    logger.error({ err: err.message }, "Update shop settings failed");
    return response.failure(res, "Update shop settings failed", 500);
  }
};

exports.listTeamMembers = async (req, res) => {
  try {
    const shop = await loadOwnedShop(req);
    if (!shop) {
      return response.failure(res, "Shop context missing", 400);
    }

    if (String(shop.owner) !== String(req.user._id)) {
      return response.failure(res, "Not your shop", 403);
    }

    const members = await User.find({
      shopId: shop._id,
      role: { $in: ["OWNER", "STAFF"] },
    }).select("name email role phone permissionOverrides invitation passwordResetRequired");

    return response.updated(res, req, members);
  } catch (error) {
    logger.error({ err: error.message }, "List team members failed");
    return response.failure(res, "Failed to load team members", 500);
  }
};

exports.addTeamMember = async (req, res) => {
  try {
    const shop = await loadOwnedShop(req);
    if (!shop) {
      return response.failure(res, "Shop context missing", 400);
    }

    if (String(shop.owner) !== String(req.user._id)) {
      return response.failure(res, "Not your shop", 403);
    }

    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });
    const invite = issueInvite(req);

    if (!user) {
      const bootstrapPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(bootstrapPassword, 10);
      user = await User.create({
        name: String(req.body.name || "").trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: req.body.phone ? String(req.body.phone).trim() : null,
        role: String(req.body.role || "STAFF").trim().toUpperCase(),
        shopId: shop._id,
        permissionOverrides: Array.isArray(req.body.permissions)
          ? req.body.permissions.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean)
          : [],
        passwordResetRequired: true,
        invitation: {
          tokenHash: invite.tokenHash,
          expiresAt: invite.expiresAt,
          invitedBy: req.user._id,
          invitedAt: new Date(),
          acceptedAt: null,
        },
      });
    } else {
      user.name = String(req.body.name || user.name || "").trim();
      user.phone = req.body.phone ? String(req.body.phone).trim() : user.phone;
      user.role = String(req.body.role || user.role || "STAFF").trim().toUpperCase();
      user.shopId = shop._id;
      user.passwordResetRequired = true;
      user.invitation = {
        ...(user.invitation || {}),
        tokenHash: invite.tokenHash,
        expiresAt: invite.expiresAt,
        invitedBy: req.user._id,
        invitedAt: new Date(),
        acceptedAt: null,
      };
      user.permissionOverrides = Array.isArray(req.body.permissions)
        ? req.body.permissions.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean)
        : user.permissionOverrides || [];
      await user.save();
    }

    await createAudit({
      action: "UPSERT_TEAM_MEMBER",
      performedBy: req.user._id,
      targetType: "User",
      targetId: user._id,
      req,
    });

    let inviteEmailSent = false;
    try {
      inviteEmailSent = await sendInviteEmail({
        email: normalizedEmail,
        name: user.name,
        inviteUrl: invite.inviteUrl,
      });
    } catch (error) {
      logger.warn({ err: error.message }, "Invite email failed");
    }

    return response.success(res, {
      data: user,
      invite: {
        inviteUrl: invite.inviteUrl,
        expiresAt: invite.expiresAt,
        emailSent: inviteEmailSent,
      },
    }, 201);
  } catch (error) {
    logger.error({ err: error.message }, "Add team member failed");
    return response.failure(res, "Failed to save team member", 500);
  }
};

exports.updateTeamMember = async (req, res) => {
  try {
    const shop = await loadOwnedShop(req);
    if (!shop) {
      return response.failure(res, "Shop context missing", 400);
    }

    if (String(shop.owner) !== String(req.user._id)) {
      return response.failure(res, "Not your shop", 403);
    }

    const member = await User.findOne({
      _id: req.params.userId,
      shopId: shop._id,
      role: { $in: ["OWNER", "STAFF"] },
    });

    if (!member) {
      return response.notFound(res, "User");
    }

    if (req.body.role !== undefined) {
      member.role = String(req.body.role || member.role).trim().toUpperCase();
    }
    if (req.body.permissions !== undefined) {
      member.permissionOverrides = Array.isArray(req.body.permissions)
        ? req.body.permissions.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean)
        : [];
    }
    let invitePayload = null;
    if (req.body.resendInvite) {
      const invite = issueInvite(req);
      member.passwordResetRequired = true;
      member.invitation = {
        ...(member.invitation || {}),
        tokenHash: invite.tokenHash,
        expiresAt: invite.expiresAt,
        invitedBy: req.user._id,
        invitedAt: new Date(),
        acceptedAt: null,
      };
      invitePayload = {
        inviteUrl: invite.inviteUrl,
        expiresAt: invite.expiresAt,
      };

      try {
        const emailSent = await sendInviteEmail({
          email: member.email,
          name: member.name,
          inviteUrl: invite.inviteUrl,
        });
        invitePayload.emailSent = emailSent;
      } catch (error) {
        logger.warn({ err: error.message }, "Resend invite email failed");
      }
    }

    await member.save();

    await createAudit({
      action: "UPDATE_TEAM_MEMBER",
      performedBy: req.user._id,
      targetType: "User",
      targetId: member._id,
      req,
    });

    return res.json({
      message: "updated",
      data: member,
      invite: invitePayload,
    });
  } catch (error) {
    logger.error({ err: error.message }, "Update team member failed");
    return response.failure(res, "Failed to update team member", 500);
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  res.json({
    message: "Order status updated (stub)",
    orderId: id,
    status,
  });
};

exports.getMyShops = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id });
    return response.updated(res, req, shops);
  } catch (error) {
    logger.warn({ err: error.message }, "Failed to fetch shops");
    return response.failure(res, "Failed to fetch shops", 500);
  }
};

exports.approveShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return response.notFound(res, "Shop");
    }

    shop.isActive = true;
    shop.status = "ACTIVE";
    await shop.save();

    await createAudit({
      action: "APPROVE_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req,
    });

    return response.updated(res, req, shop);
  } catch (error) {
    logger.error({ err: error.message }, "Shop approve failed");
    return response.failure(res, "Shop approve failed", 500);
  }
};

exports.suspendShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return response.notFound(res, "Shop");
    }

    shop.isActive = false;
    shop.status = "SUSPENDED";
    await shop.save();

    await createAudit({
      action: "SUSPEND_SHOP",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: shop._id,
      req,
    });

    return response.message(res, "Shop suspended", shop);
  } catch (error) {
    logger.error({ err: error.message }, "Shop suspend failed");
    return response.failure(res, "Shop suspend failed", 500);
  }
};

exports.blockCustomer = async (req, res) => {
  try {
    const userId = req.params.userId;
    const shopId = req.shop?._id || req.params.shopId || req.user?.shopId || null;

    if (!shopId) {
      return response.failure(res, "Shop context missing", 400);
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return response.notFound(res, "Shop");
    }

    if (String(shop.owner) !== String(req.user._id)) {
      return response.failure(res, "Not your shop", 403);
    }

    const user = await User.findById(userId);
    if (!user) {
      return response.notFound(res, "User");
    }

    user.isBlocked = true;
    await user.save();

    await createAudit({
      performedBy: req.user._id,
      action: "BLOCK_CUSTOMER",
      targetType: "User",
      targetId: user._id,
      req,
    });

    return response.message(res, "Customer blocked", user);
  } catch (error) {
    logger.error({ err: error.message }, "Block customer failed");
    return response.failure(res, "Customer block failed", 500);
  }
};
