import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Instance axios avec cookie httpOnly envoyé automatiquement (remember me)
const apiBaseUrl = process.env.NODE_ENV === 'production'
  ? '/api'
  : process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: apiBaseUrl,
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
      .catch((error) => {
        // Échec du refresh : on nettoie le promise pour permettre un nouvel essai
        refreshPromise = null;
        // Ne pas loguer les erreurs réseau qui sont normales en offline
        if (axios.isAxiosError(error) && error.code !== 'ERR_NETWORK') {
          console.error('Refresh token failed:', error);
        }
        throw error;
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

    // Gestion des erreurs réseau (perte de connexion temporaire)
    if (error.code === 'ERR_NETWORK' && config && !config._retry) {
      config._retry = true;
      // Attendre un peu avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        return api(config);
      } catch (retryError) {
        // Si ça échoue encore, on retourne l'erreur originale
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && config && !config._retry && !isAuthRoute) {
      config._retry = true;
      try {
        const newToken = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch (refreshError) {
        if (
          axios.isAxiosError(refreshError) &&
          (refreshError.response?.status === 401 || refreshError.response?.status === 403)
        ) {
          emitLoggedOut();
        }
        return Promise.reject(refreshError);
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
  message: unknown;
  path?: string;
}

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractErrorMessage(item);
      if (message) return message;
    }
  }
  if (value && typeof value === 'object' && 'message' in value) {
    return extractErrorMessage(value.message);
  }
  return null;
}

// Extrait un message affichable à l'utilisateur, quel que soit le format renvoyé par Nest
export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  // Logging pour identifier l'erreur 404
  if (axios.isAxiosError(error)) {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
  }
  if (axios.isAxiosError(error)) {
    const isAuthRoute = configIsAuthRoute(error.config?.url);
    
    // Logging pour identifier l'erreur 404
    if (error.response?.status === 404) {
      console.error('404 Error for URL:', error.config?.url);
      return 'Resource not found. Please refresh the page.';
    }
    if (error.response?.status === 401 && !isAuthRoute) {
      return 'Ta session a expiré ou tu n’es pas connecté. Connecte-toi pour effectuer cette action.';
    }
    const payload = error.response?.data as ApiErrorPayload | undefined;
    const message = extractErrorMessage(payload?.message);
    if (message) return message;
    if (error.code === 'ERR_NETWORK') {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'Tu es hors ligne. Cette action nécessite une connexion Internet. Réessaie une fois reconnecté.';
      }
      return 'Le serveur est injoignable. Vérifie ta connexion Internet puis réessaie.';
    }
    if (error.response?.status === 401) {
      return 'Connecte-toi pour effectuer cette action.';
    }
  }
  return fallback;
}

function configIsAuthRoute(url?: string): boolean {
  return Boolean(url && AUTH_ROUTES_EXCLUDED_FROM_RETRY.some((route) => url.includes(route)));
}