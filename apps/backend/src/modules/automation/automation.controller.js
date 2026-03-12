const response = require("@/utils/controllerResponse");
const service = require("./automation.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

async function createRule(req, res, next) {
  try {
    const row = await service.createRule({
      shopId: resolveShopId(req),
      actorId: req.user?._id || null,
      payload: req.body,
    });
    return response.success(res, { data: row }, 201);
  } catch (err) {
    return next(err);
  }
}

async function listRules(req, res, next) {
  try {
    const rows = await service.listRules({
      shopId: resolveShopId(req),
      trigger: req.query.trigger || null,
      limit: req.query.limit,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function executeTrigger(req, res, next) {
  try {
    const rows = await service.executeTrigger({
      shopId: resolveShopId(req),
      actorId: req.user?._id || null,
      trigger: req.body.trigger,
      context: req.body.context || {},
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function listLogs(req, res, next) {
  try {
    const rows = await service.listLogs({
      shopId: resolveShopId(req),
      trigger: req.query.trigger || null,
      limit: req.query.limit,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function listTasks(req, res, next) {
  try {
    const rows = await service.listTasks({
      shopId: resolveShopId(req),
      status: req.query.status || null,
      limit: req.query.limit,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

async function getLoyaltySummary(req, res, next) {
  try {
    const data = await service.getLoyaltySummary({
      shopId: resolveShopId(req),
      customerUserId: req.query.customerUserId || null,
      customerPhone: req.query.customerPhone || null,
      limit: req.query.limit,
    });
    return response.updated(res, req, data);
  } catch (err) {
    return next(err);
  }
}

async function getDashboard(req, res, next) {
  try {
    const data = await service.getDashboard({
      shopId: resolveShopId(req),
      limit: req.query.limit,
    });
    return response.updated(res, req, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createRule,
  listRules,
  executeTrigger,
  listLogs,
  listTasks,
  getLoyaltySummary,
  getDashboard,
};
