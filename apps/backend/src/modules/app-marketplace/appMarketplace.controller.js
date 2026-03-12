const response = require("@/utils/controllerResponse");
const service = require("./appMarketplace.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

async function listApps(req, res, next) {
  try {
    const rows = await service.listApps({
      status: req.query.status || "PUBLISHED",
      type: req.query.type || null,
      limit: req.query.limit || 50,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function ensureDeveloperProfile(req, res, next) {
  try {
    const row = await service.ensureDeveloperProfile({
      userId: req.user?._id,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function createApp(req, res, next) {
  try {
    const row = await service.createApp({
      actorId: req.user?._id,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function installApp(req, res, next) {
  try {
    const row = await service.installApp({
      shopId: resolveShopId(req),
      actorId: req.user?._id,
      appId: req.params.appId,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function listInstallations(req, res, next) {
  try {
    const rows = await service.listInstallations({
      shopId: resolveShopId(req),
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function authorize(req, res, next) {
  try {
    const data = await service.authorizeApp({
      shopId: resolveShopId(req),
      actorId: req.user?._id,
      query: req.query,
    });
    return response.success(res, { data });
  } catch (err) {
    return next(err);
  }
}

async function exchangeToken(req, res, next) {
  try {
    const data = await service.exchangeToken({
      payload: req.body,
    });
    return response.success(res, { data });
  } catch (err) {
    return next(err);
  }
}

async function createWebhook(req, res, next) {
  try {
    const data = await service.createWebhook({
      shopId: resolveShopId(req),
      actorId: req.user?._id,
      appId: req.params.appId,
      payload: req.body,
    });
    return response.success(res, { data }, 201);
  } catch (err) {
    return next(err);
  }
}

async function listWebhooks(req, res, next) {
  try {
    const rows = await service.listWebhooks({
      shopId: resolveShopId(req),
      appId: req.params.appId || null,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listApps,
  ensureDeveloperProfile,
  createApp,
  installApp,
  listInstallations,
  authorize,
  exchangeToken,
  createWebhook,
  listWebhooks,
};
