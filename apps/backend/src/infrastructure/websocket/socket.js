const { Server } = require("socket.io");

let io;

exports.init = (server) => {
  io = new Server(server);

  io.on("connection", (socket) => {
    console.log("client connected");

    socket.on("identify", ({ userId } = {}) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });
  });
};

exports.emit = (event, data) => {
  io?.emit(event, data);
};

exports.emitToUser = (userId, event, data) => {
  if (!userId) return;
  io?.to(`user:${userId}`).emit(event, data);
};
