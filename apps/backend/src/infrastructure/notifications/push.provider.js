let firebaseApp = null;

function resolveFirebaseApp() {
  if (firebaseApp) return firebaseApp;

  const serviceJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  const serviceBase64 = process.env.FCM_SERVICE_ACCOUNT_BASE64;

  if (!serviceJson && !serviceBase64) return null;

  const payload = serviceJson
    ? JSON.parse(serviceJson)
    : JSON.parse(Buffer.from(serviceBase64, "base64").toString("utf8"));

  // Lazy import to avoid boot failure when Firebase is not configured.
  // eslint-disable-next-line global-require
  const admin = require("firebase-admin");

  firebaseApp = admin.apps?.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert(payload),
      });

  return firebaseApp;
}

async function sendPush(tokens, notification, data = {}) {
  const resolvedTokens = Array.isArray(tokens) ? tokens.filter(Boolean) : [];
  if (!resolvedTokens.length) return { skipped: true };

  const app = resolveFirebaseApp();
  if (!app) {
    console.log("PUSH_SEND", { tokens: resolvedTokens, notification, data });
    return { skipped: true };
  }

  const message = {
    tokens: resolvedTokens,
    notification,
    data: Object.entries(data || {}).reduce((acc, [key, value]) => {
      acc[key] = value === undefined || value === null ? "" : String(value);
      return acc;
    }, {}),
  };

  const response = await app.messaging().sendEachForMulticast(message);
  return {
    provider: "fcm",
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}

module.exports = {
  sendPush,
};
