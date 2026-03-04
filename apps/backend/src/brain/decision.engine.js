const policy = require("./policy.guard");

exports.evaluate = async event => {

  if (event.type === "stock.low") {

    await policy.execute({
      action: "RESTOCK_SUGGESTION",
      data: event
    });

  }

  if (event.type === "sales.spike") {

    await policy.execute({
      action: "PRICE_OPTIMIZATION",
      data: event
    });

  }

};