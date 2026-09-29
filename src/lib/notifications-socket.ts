import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

export function connectNotificationsSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/notifications`, {
      withCredentials: true,
      autoConnect: false,
      auth: (callback) => callback({ token: getAccessToken() }),
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectNotificationsSocket() {
  socket?.disconnect();
}