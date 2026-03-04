const { addJob } = require("@/core/infrastructure");
const eventBus  = require("@/infrastructure/events/eventBus");
const decision = require("./decision.engine");

exports.observe = async event => {

  await decision.evaluate(event);

};
const runBrain = async () => {
  const shops = await Shop.find();

  for (const shop of shops) {
    const signals = await collectSignals({ shopId: shop._id });
    const decisions = await makeDecision({ signals });
    await addJob("settlement", { shopId: shop._id, signals, decisions });

    await executeActions(decisions);
  }
};