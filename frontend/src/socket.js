import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

export const createSocket = () =>
  io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: false,
  });
