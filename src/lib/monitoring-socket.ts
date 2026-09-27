import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

// Namespace admin-monitoring — le backend (MonitoringGateway) revérifie le rôle ADMIN
// en base à la connexion ; un non-admin est immédiatement déconnecté.
export function getMonitoringSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/admin-monitoring`, {
      withCredentials: true,
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() }),
    });
  }
  return socket;
}

export function connectMonitoringSocket(): Socket {
  const s = getMonitoringSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectMonitoringSocket() {
  socket?.disconnect();
}