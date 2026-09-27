import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

// Connexion au namespace raids (temps réel) — le token est vérifié par le backend à la connexion
// (voir RaidsGateway.handleConnection), donc une connexion sans token valide est immédiatement refusée.
export function getRaidSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/raids`, {
      withCredentials: true,
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() }),
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
  socket?.disconnect();
}