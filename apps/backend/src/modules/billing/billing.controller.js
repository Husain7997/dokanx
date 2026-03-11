const { logger } = require("@/core/infrastructure");
const response = require("@/utils/controllerResponse");
const billing = require("./billing.service");

exports.listPlans = async (req, res, next) => {
  try {
    const rows = await billing.listPlans({ activeOnly: String(req.query.activeOnly) === "true" });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};

exports.createPlan = async (req, res, next) => {
  try {
    const row = await billing.createPlan(req.body);
    return response.success(res, { data: row }, 201);
  } catch (err) {
    logger.error({ err: err.message }, "Create billing plan failed");
    return next(err);
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const row = await billing.updatePlan(req.params.planId, req.body);
    return response.updated(res, req, row);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    await billing.deletePlan(req.params.planId);
    return res.json({ success: true, message: "Plan removed" });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.assignSubscription = async (req, res) => {
  try {
    const row = await billing.assignSubscription(req.body);
    return response.updated(res, req, row);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.listSubscriptions = async (req, res, next) => {
  try {
    const rows = await billing.listSubscriptions();
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
};

function crudFactory(serviceKeyCreate, serviceKeyList, serviceKeyUpdate, serviceKeyDelete, entityLabel) {
  return {
    list: async (req, res, next) => {
      try {
        const rows = await billing[serviceKeyList]();
        return response.updated(res, req, rows);
      } catch (err) {
        return next(err);
      }
    },
    create: async (req, res, next) => {
      try {
        const row = await billing[serviceKeyCreate](req.body);
        return response.success(res, { data: row }, 201);
      } catch (err) {
        logger.error({ err: err.message }, `Create ${entityLabel} failed`);
        return next(err);
      }
    },
    update: async (req, res) => {
      try {
        const key = req.params.ruleId || req.params.packId;
        const row = await billing[serviceKeyUpdate](key, req.body);
        return response.updated(res, req, row);
      } catch (err) {
        return res.status(err.statusCode || 400).json({ success: false, message: err.message });
      }
    },
    remove: async (req, res) => {
      try {
        const key = req.params.ruleId || req.params.packId;
        await billing[serviceKeyDelete](key);
        return res.json({ success: true, message: `${entityLabel} removed` });
      } catch (err) {
        return res.status(err.statusCode || 400).json({ success: false, message: err.message });
      }
    },
  };
}

const commission = crudFactory(
  "createCommissionRule",
  "listCommissionRules",
  "updateCommissionRule",
  "deleteCommissionRule",
  "Commission rule"
);
exports.listCommissionRules = commission.list;
exports.createCommissionRule = commission.create;
exports.updateCommissionRule = commission.update;
exports.deleteCommissionRule = commission.remove;

const routing = crudFactory(
  "createPaymentRoutingRule",
  "listPaymentRoutingRules",
  "updatePaymentRoutingRule",
  "deletePaymentRoutingRule",
  "Payment routing rule"
);
exports.listPaymentRoutingRules = routing.list;
exports.createPaymentRoutingRule = routing.create;
exports.updatePaymentRoutingRule = routing.update;
exports.deletePaymentRoutingRule = routing.remove;

const sms = crudFactory(
  "createSmsPack",
  "listSmsPacks",
  "updateSmsPack",
  "deleteSmsPack",
  "SMS pack"
);
exports.listSmsPacks = sms.list;
exports.createSmsPack = sms.create;
exports.updateSmsPack = sms.update;
exports.deleteSmsPack = sms.remove;

exports.previewCommission = async (req, res) => {
  try {
    const result = await billing.previewCommission(req.body);
    return response.updated(res, req, result);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

exports.previewPaymentRouting = async (req, res) => {
  try {
    const result = await billing.previewPaymentRouting(req.body);
    return response.updated(res, req, result);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};
