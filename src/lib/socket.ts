import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Connexion au namespace raids (temps réel) — appelée seulement quand l'utilisateur rejoint un raid
export function getRaidSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}/raids`, {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}
