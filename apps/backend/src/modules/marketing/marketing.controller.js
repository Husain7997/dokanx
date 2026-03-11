const { logger } = require("@/core/infrastructure");
const response = require("@/utils/controllerResponse");
const service = require("./marketing.service");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

exports.createCoupon = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const coupon = await service.createCoupon({
      shopId,
      actorId: req.user?._id || null,
      payload: req.body,
    });

    return response.success(res, { data: coupon }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create coupon failed");
    return next(err);
  }
};

exports.listCoupons = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const rows = await service.listCoupons({ shopId, filters: req.query });
    return response.updated(res, req, rows);
  } catch (err) {
    logger.error({ err: err.message }, "List coupons failed");
    return next(err);
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const coupon = await service.updateCoupon({
      shopId,
      code: req.params.code,
      actorId: req.user?._id || null,
      payload: req.body,
    });

    return response.updated(res, req, coupon);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.evaluateCoupon = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const result = await service.evaluateCoupon({
      shopId,
      code: req.params.code,
      cartSubtotal: req.query.cartSubtotal,
      shippingFee: req.query.shippingFee,
      itemCount: req.query.itemCount,
    });

    return response.updated(res, req, result);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.createAutomationRule = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const rule = await service.createAutomationRule({
      shopId,
      actorId: req.user?._id || null,
      payload: req.body,
    });

    return response.success(res, { data: rule }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create automation rule failed");
    return next(err);
  }
};

exports.listAutomationRules = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const rows = await service.listAutomationRules({
      shopId,
      filters: req.query,
    });

    return response.updated(res, req, rows);
  } catch (err) {
    logger.error({ err: err.message }, "List automation rules failed");
    return next(err);
  }
};

exports.updateAutomationRule = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const rule = await service.updateAutomationRule({
      shopId,
      ruleId: req.params.ruleId,
      actorId: req.user?._id || null,
      payload: req.body,
    });

    return response.updated(res, req, rule);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getAutomationPreview = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const preview = await service.getAutomationPreview({
      shopId,
      ruleId: req.params.ruleId,
    });

    return response.updated(res, req, preview);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.executeAutomationTrigger = async (req, res) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const rows = await service.executeAutomationTrigger({
      shopId,
      trigger: req.body.trigger,
      context: req.body.context || {},
    });

    return response.updated(res, req, rows);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.listAutomationExecutions = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return response.failure(res, "Shop context missing", 400);

    const rows = await service.listAutomationExecutions({
      shopId,
      trigger: req.query.trigger || null,
      limit: req.query.limit || 50,
    });

    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};
