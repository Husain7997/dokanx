const AppInstallation = require("../../models/appInstallation.model");
const AppListing = require("../../models/appListing.model");
const OAuthApp = require("../../models/oauthApp.model");
const { createAudit } = require("../../utils/audit.util");
const { recordPlatformAudit } = require("../platform-hardening/platform-audit.service");

async function installApp({ appId, shopId, installedBy, sandboxMode = false, req = null }) {
  const installation = await AppInstallation.findOneAndUpdate(
    { appId, shopId },
    {
      status: "INSTALLED",
      installedBy: installedBy || null,
      installedAt: new Date(),
      uninstalledAt: null,
      sandboxMode: Boolean(sandboxMode),
    },
    { new: true, upsert: true }
  );
  if (req) {
    await createAudit({
      action: "INSTALL_APP",
      performedBy: installedBy,
      targetType: "AppInstallation",
      targetId: installation._id,
      req,
      meta: { appId, shopId, sandboxMode: Boolean(sandboxMode) },
    });
    await recordPlatformAudit({
      action: "INSTALL_APP",
      category: "app_install",
      actorType: req.user?.role || "system",
      actorId: installedBy || null,
      shopId,
      appId,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      ip: req.ip,
      metadata: { sandboxMode: Boolean(sandboxMode) },
    });
  }
  return installation;
}

async function uninstallApp({ appId, shopId, req = null, installedBy = null }) {
  const installation = await AppInstallation.findOneAndUpdate(
    { appId, shopId },
    {
      status: "UNINSTALLED",
      uninstalledAt: new Date(),
    },
    { new: true }
  );
  if (installation && req) {
    await createAudit({
      action: "UNINSTALL_APP",
      performedBy: installedBy,
      targetType: "AppInstallation",
      targetId: installation._id,
      req,
      meta: { appId, shopId },
    });
    await recordPlatformAudit({
      action: "UNINSTALL_APP",
      category: "app_install",
      actorType: req.user?.role || "system",
      actorId: installedBy || null,
      shopId,
      appId,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      ip: req.ip,
      metadata: {},
    });
  }
  return installation;
}

async function listAdminApps() {
  const listings = await AppListing.find({})
    .sort({ createdAt: -1 })
    .lean();

  const appIds = listings.map((item) => item.appId).filter(Boolean);
  const [apps, installations] = await Promise.all([
    OAuthApp.find({ _id: { $in: appIds } }).lean(),
    AppInstallation.find({ appId: { $in: appIds } }).lean(),
  ]);

  const appById = new Map(apps.map((app) => [String(app._id), app]));
  const installsByAppId = installations.reduce((acc, item) => {
    const key = String(item.appId);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return listings.map((listing) => {
    const app = appById.get(String(listing.appId)) || null;
    return {
      ...listing,
      appStatus: app?.status || "DRAFT",
      sandboxMode: Boolean(app?.sandboxMode),
      installations: (installsByAppId[String(listing.appId)] || []).length,
      installationStatus: installsByAppId[String(listing.appId)] || [],
    };
  });
}

module.exports = {
  installApp,
  uninstallApp,
  listAdminApps,
};
