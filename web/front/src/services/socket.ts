import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000"; // Adjust to your backend URL

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
    });
  }
  return socket;
};

export const connectSocket = (userId: string) => {
  const s = getSocket();
  if (s.connected) {
    s.emit("authenticate", userId);
  } else {
    s.on("connect", () => {
      s.emit("authenticate", userId);
    });
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
