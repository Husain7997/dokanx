const learning = require("./learning.store");

exports.observe = async (event) => {

  await learning.record({
    type: event.type,
    timestamp: Date.now(),
    payload: event
  });

};