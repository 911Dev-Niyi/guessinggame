export const setupGameSessionSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    socket.on("joinSession", ({ sessionId }) => {
      socket.join(sessionId);
      console.log(`Socket ${socket.id} joined room ${sessionId}`);
    });

    socket.on("leaveSession", ({ sessionId }) => {
      socket.leave(sessionId);
      console.log(`Socket ${socket.id} left room ${sessionId}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);

    });
  });
};
