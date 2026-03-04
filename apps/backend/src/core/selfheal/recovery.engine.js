const queues = require("../../queues");

exports.recover = async () => {

  for (const q of queues.all()) {

    const stalled = await q.getStalledCount();

    if (stalled > 0) {
      console.log("Recovering queue:", q.name);
      await q.resume();
    }
  }
};