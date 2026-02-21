// require('dotenv').config();
// require("./infrastructure/redis/redis.client");
// require("./jobs/settlement.worker");
// require("./jobs/payout.worker");
// require("./infrastructure/scheduler/autoSettlement.scheduler");
// require("./infrastructure/events/listeners");
// require("./infrastructure/notifications/notification.listener");
// require(
//  "./infrastructure/websocket/socket"
// ).init(server);
// require("./infrastructure/cacheSync/cacheSync");




// const mongoose = require('mongoose');
// const app = require('./app');
// const config = require('./config');
// const features = require('./config/features');
// const { startAutoSettlementCron } = require('./jobs/autoSettlement.job');

// const http = require("http");

// const server = http.createServer(app);



// async function startServer() {
//   await mongoose.connect(config.db.uri);
//   console.log('✅ MongoDB connected');

//   // runtime-only cron
//   if (process.env.NODE_ENV !== 'test' && features.settlement) {
//     startAutoSettlementCron();
//   }



//   app.listen(config.app.port, () => {
//     console.log(`🚀 DokanX running on port ${config.app.port}`);
//   });
// }

// // ❗ Jest এ কখনো auto-start হবে না
// if (process.env.NODE_ENV !== 'test') {
//   startServer();
// }

// module.exports = { startServer };
require("dotenv").config();

const http = require("http");
const mongoose = require("mongoose");
mongoose.set('strictPopulate', false);
const app = require("./app");

const startServer = async () => {
  try {
    // ✅ MongoDB connect
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected");

    const server = http.createServer(app);

    // websocket
    require("./infrastructure/websocket/socket").init(server);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () =>
      console.log(`🚀 DokanX running on ${PORT}`)
    );

    // graceful shutdown
    require("./infrastructure/graceful/shutdown")(server);

  } catch (err) {
    console.error("❌ DB Connection Failed", err);
    process.exit(1);
  }
};

// cluster boot
require("./infrastructure/cluster/cluster")(startServer);
