"use client";

import { io, Socket } from "socket.io-client";
import { getToken } from "./api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const s = io(BASE, {
      auth: { token: getToken() },
      autoConnect: false,
      // Efficient reconnect: socket.io backoff (0.8s → 8s max, jittered, forever).
      // Re-auth on every attempt so a rotated session never sticks a dead socket.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.5,
      timeout: 15000,
    });
    s.io.on("reconnect_attempt", () => {
      s.auth = { token: getToken() };
    });
    if (typeof window !== "undefined") {
      // Internet drop → reconnect the moment the browser is back online
      // instead of waiting out the backoff window.
      window.addEventListener("online", () => {
        if (getToken() && !s.connected) s.connect();
      });
    }
    socket = s;
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
