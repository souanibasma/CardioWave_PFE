import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer;
const userSockets = new Map<string, string[]>(); // userId -> socketIds[]

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    socket.on("authenticate", (userId: string) => {
      if (userId) {
        console.log(`[Socket] User authenticated: ${userId} with socket ${socket.id}`);
        const sockets = userSockets.get(userId) || [];
        if (!sockets.includes(socket.id)) {
          sockets.push(socket.id);
          userSockets.set(userId, sockets);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      // Remove socket from user mapping
      for (const [userId, sockets] of userSockets.entries()) {
        const index = sockets.indexOf(socket.id);
        if (index !== -1) {
          sockets.splice(index, 1);
          if (sockets.length === 0) {
            userSockets.delete(userId);
          } else {
            userSockets.set(userId, sockets);
          }
          break;
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
  const sockets = userSockets.get(userId.toString());
  if (sockets && sockets.length > 0) {
    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
    console.log(`[Socket] Emitted ${event} to user ${userId}`);
  } else {
    console.log(`[Socket] User ${userId} not connected, event ${event} not emitted via socket`);
  }
};
