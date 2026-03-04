const Event = require("../models/event.model");
const { addJob, redis  } = require("@/core/infrastructure");

async function pipeline() {

  const events = await Event
    .find({})
    .sort({ createdAt: -1 })
    .limit(100);

await addJob("settlement", { events });

  console.log("Analytics batch", events.length);
}

setInterval(pipeline, 15000);