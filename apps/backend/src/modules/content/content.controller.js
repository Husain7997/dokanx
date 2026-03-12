const response = require("@/utils/controllerResponse");
const service = require("./content.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

async function upsertPage(req, res, next) {
  try {
    const row = await service.upsertPage({ shopId: resolveShopId(req), payload: req.body });
    return response.updated(res, req, row);
  } catch (err) {
    return next(err);
  }
}

async function listPages(req, res, next) {
  try {
    const rows = await service.listPages({ shopId: resolveShopId(req) });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function upsertSeoRule(req, res, next) {
  try {
    const row = await service.upsertSeoRule({ shopId: resolveShopId(req), payload: req.body });
    return response.updated(res, req, row);
  } catch (err) {
    return next(err);
  }
}

async function listSeoRules(req, res, next) {
  try {
    const rows = await service.listSeoRules({ shopId: resolveShopId(req) });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function createExperiment(req, res, next) {
  try {
    const row = await service.createExperiment({ shopId: resolveShopId(req), payload: req.body });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function listExperiments(req, res, next) {
  try {
    const rows = await service.listExperiments({ shopId: resolveShopId(req) });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  upsertPage,
  listPages,
  upsertSeoRule,
  listSeoRules,
  createExperiment,
  listExperiments,
};
