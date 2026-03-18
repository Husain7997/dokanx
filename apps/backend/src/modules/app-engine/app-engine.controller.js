const { installApp, uninstallApp, listAdminApps } = require("./app-engine.service");

exports.listAdminApps = async (_req, res) => {
  const data = await listAdminApps();
  res.json({ data });
};

exports.installApp = async (req, res) => {
  const { appId, shopId, sandboxMode } = req.body || {};
  if (!appId || !shopId) {
    return res.status(400).json({ message: "appId and shopId required" });
  }

  if (req.user?.role !== "ADMIN" && String(req.user?.shopId || "") !== String(shopId)) {
    return res.status(403).json({ message: "Cannot install app for another shop" });
  }

  const data = await installApp({
    appId,
    shopId,
    installedBy: req.user?._id || null,
    sandboxMode,
    req,
  });
  return res.json({ message: "App installed", data });
};

exports.uninstallApp = async (req, res) => {
  const { appId, shopId } = req.body || {};
  if (!appId || !shopId) {
    return res.status(400).json({ message: "appId and shopId required" });
  }

  if (req.user?.role !== "ADMIN" && String(req.user?.shopId || "") !== String(shopId)) {
    return res.status(403).json({ message: "Cannot uninstall app for another shop" });
  }

  const data = await uninstallApp({ appId, shopId, req, installedBy: req.user?._id || null });
  return res.json({ message: "App uninstalled", data });
};
