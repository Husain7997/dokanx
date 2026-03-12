const AutomationRule = require("./models/automationRule.model");
const AutomationLog = require("./models/automationLog.model");
const AutomationTask = require("./models/automationTask.model");
const LoyaltyPointLedger = require("./models/loyaltyPointLedger.model");
const { executeAction } = require("./actionExecutor");

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function compare(actual, operator, expected) {
  if (operator === "EQ") return actual === expected;
  if (operator === "GT") return Number(actual) > Number(expected);
  if (operator === "GTE") return Number(actual) >= Number(expected);
  if (operator === "LT") return Number(actual) < Number(expected);
  if (operator === "LTE") return Number(actual) <= Number(expected);
  if (operator === "NEQ") return actual !== expected;
  return false;
}

function resolveContextValue(context = {}, field = "") {
  return String(field || "")
    .split(".")
    .filter(Boolean)
    .reduce((current, part) => {
      if (!current || typeof current !== "object") return undefined;
      return current[part];
    }, context);
}

function evaluateConditions(conditions = [], context = {}) {
  if (!conditions.length) return true;

  return conditions.every(condition => {
    const field = String(condition.field || "").trim();
    if (!field) return false;
    const actual = resolveContextValue(context, field);
    return compare(actual, asUpper(condition.operator || "EQ"), condition.value);
  });
}

async function executeActions({ shopId, actorId, actions = [], context = {} }) {
  const results = [];
  for (const action of actions) {
    try {
      results.push(await executeAction({ shopId, actorId, action, context }));
    } catch (err) {
      results.push({
        type: asUpper(action?.type),
        status: "FAILED",
        error: err.message,
      });
    }
  }
  return results;
}

async function createRule({ shopId, actorId, payload }) {
  return AutomationRule.create({
    shopId,
    name: String(payload.name || "").trim(),
    trigger: asUpper(payload.trigger),
    conditions: Array.isArray(payload.conditions) ? payload.conditions : [],
    actions: Array.isArray(payload.actions) ? payload.actions : [],
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : true,
    createdBy: actorId || null,
  });
}

async function listRules({ shopId, trigger = null, limit = 50 }) {
  const query = { shopId };
  if (trigger) query.trigger = asUpper(trigger);

  return AutomationRule.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

async function executeTrigger({ shopId, actorId = null, trigger, context = {} }) {
  const rules = await AutomationRule.find({
    shopId,
    trigger: asUpper(trigger),
    enabled: true,
  }).lean();

  const logs = [];
  for (const rule of rules) {
    const matched = evaluateConditions(rule.conditions || [], context);
    const result = matched
      ? { actions: await executeActions({ shopId, actorId, actions: rule.actions || [], context }) }
      : { skippedReason: "CONDITIONS_NOT_MET" };

    const hasFailure = matched && (result.actions || []).some(action => action.status === "FAILED");
    const log = await AutomationLog.create({
      shopId,
      ruleId: rule._id,
      trigger: asUpper(trigger),
      status: matched ? (hasFailure ? "FAILED" : "EXECUTED") : "SKIPPED",
      context,
      result,
    });
    logs.push(log);
  }

  return logs;
}

async function listLogs({ shopId, trigger = null, limit = 50 }) {
  const query = { shopId };
  if (trigger) query.trigger = asUpper(trigger);

  return AutomationLog.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

async function listTasks({ shopId, status = null, limit = 50 }) {
  const query = { shopId };
  if (status) query.status = asUpper(status);

  return AutomationTask.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
}

async function getLoyaltySummary({ shopId, customerUserId = null, customerPhone = null, limit = 50 }) {
  const match = { shopId };
  if (customerUserId) match.customerUserId = customerUserId;
  if (customerPhone) match.customerPhone = String(customerPhone).trim();

  const [entries, totals] = await Promise.all([
    LoyaltyPointLedger.find(match)
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
      .lean(),
    LoyaltyPointLedger.aggregate([
      { $match: match },
      { $group: { _id: null, totalPoints: { $sum: "$points" }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalPoints: Number(totals[0]?.totalPoints || 0),
    count: Number(totals[0]?.count || 0),
    entries,
  };
}

async function getDashboard({ shopId, limit = 10 }) {
  const [taskCounts, loyaltyTotals, recentTasks, recentLoyalty] = await Promise.all([
    AutomationTask.aggregate([
      { $match: { shopId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    LoyaltyPointLedger.aggregate([
      { $match: { shopId } },
      { $group: { _id: null, totalPoints: { $sum: "$points" }, customerCount: { $sum: 1 } } },
    ]),
    AutomationTask.find({ shopId })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 10, 1), 50))
      .lean(),
    LoyaltyPointLedger.find({ shopId })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 10, 1), 50))
      .lean(),
  ]);

  return {
    taskCounts,
    loyalty: {
      totalPoints: Number(loyaltyTotals[0]?.totalPoints || 0),
      customerCount: Number(loyaltyTotals[0]?.customerCount || 0),
      recentEntries: recentLoyalty,
    },
    recentTasks,
  };
}

module.exports = {
  createRule,
  listRules,
  executeTrigger,
  listLogs,
  listTasks,
  getLoyaltySummary,
  getDashboard,
  _internals: {
    evaluateConditions,
    executeActions,
    resolveContextValue,
  },
};
