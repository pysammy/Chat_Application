import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;
const userSocketMap = new Map();

const parseCookies = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies?.jwt;
      if (!token) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      return next();
    } catch (err) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    if (!socket.userId) {
      socket.disconnect();
      return;
    }

    userSocketMap.set(String(socket.userId), socket.id);
    io.emit("users:online", Array.from(userSocketMap.keys()));

    socket.on("disconnect", () => {
      userSocketMap.delete(String(socket.userId));
      io.emit("users:online", Array.from(userSocketMap.keys()));
    });
  });
};

export const getIO = () => io;

export const getReceiverSocketId = (receiverId) => {
  if (!receiverId) return null;
  return userSocketMap.get(String(receiverId));
};
