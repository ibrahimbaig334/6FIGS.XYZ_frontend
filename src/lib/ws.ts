"use client";

import { io, Socket } from "socket.io-client";
import { getToken } from "./api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BASE, { auth: { token: getToken() }, autoConnect: false });
  } else {
    socket.auth = { token: getToken() };
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
