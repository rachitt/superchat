"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@superchat/shared";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      autoConnect: false,
      withCredentials: true,
    });
  }
  return socket;
}

export function connectSocket(userId: string, username: string) {
  const s = getSocket();
  s.auth = { userId, username };
  s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
