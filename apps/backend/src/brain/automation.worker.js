const { addJob } = require("@/core/infrastructure");



module.exports.executeActions = async (actions) => {
  for (const action of actions) {
    switch (action.type) {
      case "CREATE_RESTOCK_ALERT":
        await createAlert(action);
        await addJob("executeActions", action.payload);
        break;
    }
  }
};