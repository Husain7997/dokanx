const Suggestion = require("../models/suggestion.model");

exports.review = async () => {

  const pending = await Suggestion.find({
    approved: false
  });

  return pending;
};
