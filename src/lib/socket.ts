import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

// Connexion au namespace raids (temps réel) — le token est vérifié par le backend à la connexion
// (voir RaidsGateway.handleConnection), donc une connexion sans token valide est immédiatement refusée.
export function getRaidSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/raids`, {
      withCredentials: true,
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() }),
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
    });

    // Gestion des événements de connexion
    socket.on('connect', () => {
      console.log('Raid socket connected');
      reconnectAttempts = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('Raid socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Le serveur a déconnecté le client, on tente de se reconnecter
        socket?.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Raid socket connection error:', error);
      reconnectAttempts++;
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached for raid socket');
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

// À appeler à chaque tentative de connexion pour être sûr d'envoyer le token courant
// (l'access token change après chaque rotation de refresh — un socket ouvert trop tôt aurait un token périmé)
export function connectRaidSocket(): Socket {
  const s = getRaidSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectRaidSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
}

// Fonction pour forcer la reconnexion avec un nouveau token
export function reconnectRaidSocket() {
  disconnectRaidSocket();
  const newSocket = getRaidSocket();
  newSocket.connect();
  return newSocket;
}