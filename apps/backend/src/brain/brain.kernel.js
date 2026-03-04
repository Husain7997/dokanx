const strategy =
  require("./strategy.engine");

const learning =
  require("./learning.engine");

exports.think = async snapshot => {

  await learning.learn(snapshot);

  return strategy.decide(snapshot);
};