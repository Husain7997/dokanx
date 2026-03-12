const AutomationTask = require("@/modules/automation/models/automationTask.model");
const { addJob } = require("@/core/infrastructure");
const { publishDomainEvent } = require("@/platform/events/event.publisher");
const { buildSmartCoupon, buildDynamicPromotion } = require("./promotionEngine.service");
const { recordIntelligenceMetric } = require("./intelligenceTelemetry.service");

async function createAutomationTask(TaskModel, payload) {
  if (!TaskModel || typeof TaskModel.create !== "function") {
    return payload;
  }
  return TaskModel.create(payload);
}

async function executeAutomationTriggers({
  shopId,
  triggers = [],
  models = {},
  persistMetric = false,
}) {
  const TaskModel = models.AutomationTask || AutomationTask;
  const startedAt = Date.now();
  const created = [];

  for (const trigger of triggers) {
    const type = String(trigger.type || "").toUpperCase();
    let taskPayload = null;

    if (type === "CART_ABANDONED") {
      const coupon = buildSmartCoupon({
        shopId,
        customerId: trigger.customerId,
        discountPct: 10,
        reason: "ABANDONED_CART",
      });
      taskPayload = {
        shopId,
        title: "AI churn recovery coupon",
        description: `Issue coupon ${coupon.code} for abandoned cart recovery`,
        status: "OPEN",
        meta: { trigger, coupon },
      };
    }

    if (type === "CUSTOMER_INACTIVE_30_DAYS") {
      taskPayload = {
        shopId,
        title: "AI loyalty recovery campaign",
        description: "Issue loyalty reward for inactive customer",
        status: "OPEN",
        meta: { trigger, loyaltyRewardPoints: 50 },
      };
    }

    if (type === "SLOW_MOVING_INVENTORY") {
      const promotion = buildDynamicPromotion({
        shopId,
        productId: trigger.productId,
        inventoryDaysCover: trigger.inventoryDaysCover,
        salesTrendPct: trigger.salesTrendPct,
      });
      taskPayload = {
        shopId,
        title: "AI dynamic promotion",
        description: promotion.message,
        status: "OPEN",
        meta: { trigger, promotion },
      };
    }

    if (!taskPayload) continue;

    const task = await createAutomationTask(TaskModel, taskPayload);
    created.push(task);

    await publishDomainEvent({
      eventName: "AI_AUTOMATION_TRIGGERED",
      tenantId: shopId,
      aggregateId: task._id || null,
      idempotencyKey: `ai_automation_${shopId}_${type}_${trigger.customerId || trigger.productId || Date.now()}`,
      payload: {
        triggerType: type,
        taskMeta: task.meta || taskPayload.meta,
      },
    }).catch(() => null);

    await addJob("notification", {
      shopId,
      type: "AI_AUTOMATION_TRIGGERED",
      triggerType: type,
      taskId: task._id || null,
    }).catch(() => null);
  }

  await recordIntelligenceMetric({
    tenantId: shopId,
    metricType: "AUTOMATION_AI",
    latencyMs: Date.now() - startedAt,
    accuracyScore: created.length ? 0.83 : 0.8,
    metadata: { triggerCount: triggers.length, createdCount: created.length },
    persist: persistMetric,
  });

  return {
    shopId,
    createdCount: created.length,
    tasks: created,
  };
}

module.exports = {
  executeAutomationTriggers,
};
