const cluster = require("cluster");
const os = require("os");

module.exports = (startServer) => {
  if (cluster.isPrimary) {
    const cpus = os.cpus().length;

    console.log(`🚀 Master running (${cpus} CPUs)`);

    for (let i = 0; i < cpus; i++) {
      cluster.fork();
    }

    cluster.on("exit", () => {
      console.log("Worker died. Restarting...");
      cluster.fork();
    });

  } else {
    startServer();
  }
};
