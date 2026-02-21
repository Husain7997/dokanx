const { Server } = require("socket.io");

let io;

exports.init = (server) => {
  io = new Server(server);

  io.on("connection", (socket) => {
    console.log("⚡ client connected");
  });
};

exports.emit = (event, data) => {
  io?.emit(event, data);
};
