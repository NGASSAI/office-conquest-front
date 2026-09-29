import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

export function getNotificationsSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/notifications`, {
      withCredentials: true,
      autoConnect: false,
      auth: (callback) => callback({ token: getAccessToken() }),
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
    });

    // Gestion des événements de connexion
    socket.on('connect', () => {
      console.log('Notifications socket connected');
      reconnectAttempts = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('Notifications socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Le serveur a déconnecté le client, on tente de se reconnecter
        socket?.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Notifications socket connection error:', error);
      reconnectAttempts++;
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached for notifications socket');
      }
    });

    // Mettre à jour le token à chaque reconnexion
    socket.on('reconnect_attempt', () => {
      if (socket) {
        socket.auth = { token: getAccessToken() };
      }
    });
  }
  return socket;
}

export function disconnectNotificationsSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
}

// Fonction pour forcer la reconnexion avec un nouveau token
export function reconnectNotificationsSocket() {
  disconnectNotificationsSocket();
  const newSocket = getNotificationsSocket();
  newSocket.connect();
  return newSocket;
}