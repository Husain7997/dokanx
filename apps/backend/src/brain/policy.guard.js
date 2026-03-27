const Suggestion = require("../models/suggestion.model");

exports.execute = async decision => {

  if (decision.action === "FINANCIAL") {
    throw new Error("AI cannot execute finance");
  }

  await Suggestion.create(decision);

};
