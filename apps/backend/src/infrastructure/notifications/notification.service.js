const Notification = require("@/models/notification.model");
const NotificationSetting = require("@/models/notificationSetting.model");
const User = require("@/models/user.model");
const mailer = require("@/infrastructure/mail/mail.service");
const { dispatchWebhooks } = require("@/services/webhook.service");
const socket = require("@/infrastructure/websocket/socket");
const { sendSms: sendSmsProvider } = require("./sms.provider");
const { sendPush: sendPushProvider } = require("./push.provider");
const templates = require("./notification.templates");

const DEFAULT_DELIVERY_DATE = "Within 3-5 days";

function renderTemplate(text, vars) {
  if (!text) return "";
  return Object.keys(vars || {}).reduce((output, key) => {
    const value = vars[key] === undefined || vars[key] === null ? "" : String(vars[key]);
    return output.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }, text);
}

function mergeDefaults(doc) {
  const defaults = {
    channels: {
      email: true,
      sms: false,
      push: true,
      inApp: true,
      webhook: true,
    },
    categories: {
      order: true,
      payment: true,
      inventory: true,
      marketing: false,
      system: true,
    },
  };

  return {
    channels: { ...defaults.channels, ...(doc?.channels || {}) },
    categories: { ...defaults.categories, ...(doc?.categories || {}) },
  };
}

async function resolveSettings(userId) {
  const settings = await NotificationSetting.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after" }
  ).lean();

  return mergeDefaults(settings);
}

function resolveLocale(user, payload) {
  return payload?.lang || user?.language || user?.locale || "en";
}

function resolveTemplate(template, locale) {
  const fallback = template.locales?.en || {};
  const localized = template.locales?.[locale] || {};

  return {
    ...template,
    ...fallback,
    ...localized,
    email: { ...(fallback.email || {}), ...(localized.email || {}) },
    push: { ...(fallback.push || {}), ...(localized.push || {}) },
  };
}

function resolveChannels(template, settings) {
  const channels = new Set(template.channels || []);
  const allowed = [];

  if (settings.categories[template.category] !== true) return allowed;

  if (channels.has("inApp") && settings.channels.inApp) allowed.push("inApp");
  if (channels.has("email") && settings.channels.email) allowed.push("email");
  if (channels.has("sms") && settings.channels.sms) allowed.push("sms");
  if (channels.has("push") && settings.channels.push) allowed.push("push");
  if (channels.has("webhook") && settings.channels.webhook) allowed.push("webhook");

  return allowed;
}

function buildVars(payload, user) {
  const orderId = payload.orderId || payload.order?._id || payload._id || payload.order;
  const amount = payload.amount || payload.totalAmount || payload.grossAmount || "";
  const trackingNumber = payload.trackingNumber || payload.tracking || "";
  const deliveryDate = payload.deliveryDate || DEFAULT_DELIVERY_DATE;
  const productName = payload.productName || payload.product?.name || "";
  const stock = payload.stock ?? payload.currentStock ?? "";
  const shopName = payload.shopName || payload.shop?.name || "";
  const payoutId = payload.payoutId || payload.payout?._id || "";
  return {
    orderId,
    amount,
    trackingNumber,
    deliveryDate,
    productName,
    stock,
    shopName,
    payoutId,
    customerName: user?.name || "Customer",
    merchantName: user?.name || "Merchant",
  };
}

async function sendInApp(userId, templateKey, template, rendered, payload) {
  const notification = await Notification.create({
    userId,
    title: rendered.title || template.title || "Notification",
    message: rendered.message || template.message || "",
    type: template.category || "INFO",
    metadata: {
      event: template.webhookEvent || templateKey,
      payload,
    },
  });

  if (typeof socket.emitToUser === "function") {
    socket.emitToUser(userId, "notification:new", notification);
  }

  return notification;
}

async function sendEmail(user, template, rendered) {
  if (!user?.email) return;
  const subject = rendered.emailSubject || rendered.title || template.email?.subject || template.title;
  const html = rendered.emailHtml || template.email?.html || rendered.message;
  await mailer.send(user.email, subject, html);
}

async function sendSms(user, rendered, template) {
  if (!user?.phone) return;
  const text = rendered.sms || template.sms || rendered.message;
  await sendSmsProvider(user.phone, text);
}

async function sendPush(user, rendered, template, templateKey) {
  const title = rendered.pushTitle || template.push?.title || rendered.title || template.title;
  const body = rendered.pushBody || template.push?.body || rendered.message || template.message;
  const tokens = [
    ...(Array.isArray(user?.pushTokens) ? user.pushTokens : []),
    ...(Array.isArray(user?.deviceTokens) ? user.deviceTokens : []),
  ];
  await sendPushProvider(tokens, { title, body }, { event: template.webhookEvent || templateKey });
}

async function sendWebhook(template, payload, eventType) {
  const event = template.webhookEvent || eventType;
  if (!event) return;
  await dispatchWebhooks(event, payload);
}

async function dispatchNotification({ userId, templateKey, payload, eventType }) {
  const rawTemplate = templates[templateKey];
  if (!rawTemplate) return;

  const user = await User.findById(userId).lean();
  if (!user) return;

  const locale = resolveLocale(user, payload);
  const template = resolveTemplate(rawTemplate, locale);

  const settings = await resolveSettings(userId);
  const channels = resolveChannels(template, settings);
  if (!channels.length) return;

  const vars = buildVars(payload || {}, user);
  const rendered = {
    title: renderTemplate(template.title, vars),
    message: renderTemplate(template.message, vars),
    emailSubject: renderTemplate(template.email?.subject, vars),
    emailHtml: renderTemplate(template.email?.html, vars),
    sms: renderTemplate(template.sms, vars),
    pushTitle: renderTemplate(template.push?.title, vars),
    pushBody: renderTemplate(template.push?.body, vars),
  };

  if (channels.includes("inApp")) {
    await sendInApp(userId, templateKey, template, rendered, payload);
  }
  if (channels.includes("email")) {
    await sendEmail(user, template, rendered);
  }
  if (channels.includes("sms")) {
    await sendSms(user, rendered, template);
  }
  if (channels.includes("push")) {
    await sendPush(user, rendered, template, templateKey);
  }
  if (channels.includes("webhook")) {
    await sendWebhook(template, payload, eventType);
  }
}

module.exports = {
  dispatchNotification,
  resolveSettings,
};

