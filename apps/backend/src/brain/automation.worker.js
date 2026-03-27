const { addJob } = require("@/core/infrastructure");
const { executeAnalyticsAction } = require("./analytics.handlers");

module.exports.executeActions = async (actions) => {
  for (const action of actions) {
    switch (action.type) {
      case "CREATE_RESTOCK_ALERT":
        await executeAnalyticsAction(action);
        await addJob("executeActions", action, { queueName: "analytics" });
        break;
      default:
        await addJob("executeActions", action, { queueName: "analytics" });
        break;
    }
  }
};
