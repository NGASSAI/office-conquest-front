import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Instance axios avec cookie httpOnly envoyé automatiquement (remember me)
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// Stocke l'access token en mémoire uniquement — jamais en localStorage/sessionStorage
// (un XSS pourrait lire le storage, pas une variable de module non exposée).
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Routes d'auth elles-mêmes : jamais retentées via le mécanisme de refresh (évite les boucles)
const AUTH_ROUTES_EXCLUDED_FROM_RETRY = ['/auth/login', '/auth/register', '/auth/refresh'];

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Une seule requête de refresh à la fois : les 401 concurrents (plusieurs requêtes
// parallèles au chargement de la page) attendent le même refresh au lieu d'en déclencher N.
let refreshPromise: Promise<string> | null = null;

// Découplé du routeur pour que ce fichier reste indépendant de Next — l'app écoute cet événement
// pour rediriger vers /login uniquement si l'action en cours nécessitait vraiment une session.
export const AUTH_LOGOUT_EVENT = 'office-conquest:auth-logout';
function emitLoggedOut() {
  setAccessToken(null);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
  }
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const isAuthRoute = config?.url && AUTH_ROUTES_EXCLUDED_FROM_RETRY.some((r) => config.url!.includes(r));

    if (error.response?.status === 401 && config && !config._retry && !isAuthRoute) {
      config._retry = true;
      try {
        const newToken = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch {
        emitLoggedOut();
      }
    }

    if (error.response?.status === 401 && isAuthRoute) {
      emitLoggedOut();
    }

    return Promise.reject(error);
  },
);

// Forme normalisée d'une erreur API (le backend renvoie { statusCode, message, path, timestamp })
export interface ApiErrorPayload {
  statusCode: number;
  message: string | string[];
  path?: string;
}

// Extrait un message affichable à l'utilisateur, quel que soit le format renvoyé par Nest
export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    if (payload?.message) {
      return Array.isArray(payload.message) ? payload.message[0] : payload.message;
    }
    if (error.code === 'ERR_NETWORK') return 'Impossible de joindre le serveur';
  }
  return fallback;
}