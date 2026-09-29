import axios from 'axios';
import { api, setAccessToken } from './api';
import type { AuthUser } from '../store/auth-store';

export interface RegisterPayload {
  email: string;
  pseudo: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

async function persistTokenAndFetchUser(accessToken: string): Promise<AuthUser> {
  setAccessToken(accessToken);
  const { data } = await api.get<AuthUser>('/users/me');
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const { data } = await api.post('/auth/register', payload);
  return persistTokenAndFetchUser(data.accessToken);
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const { data } = await api.post('/auth/login', payload);
  return persistTokenAndFetchUser(data.accessToken);
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

// Tente de restaurer la session via le cookie httpOnly (remember me) — appelé une fois au chargement.
// Échec silencieux attendu pour un visiteur non inscrit : ce n'est pas une erreur à afficher.
export async function restoreSession(): Promise<AuthUser | null> {
  try {
    const { data } = await api.post('/auth/refresh');
    return await persistTokenAndFetchUser(data.accessToken);
  } catch (error) {
    // Gérer les erreurs réseau et les erreurs d'authentification silencieusement
    if (axios.isAxiosError(error)) {
      // 401 = pas de session valide (visiteur)
      if (error.response?.status === 401) return null;
      // Network Error = problème de connexion (offline, backend down)
      if (error.code === 'ERR_NETWORK' || !error.response) return null;
    }
    // Autres erreurs: ne pas throw pour éviter de crasher l'app
    return null;
  }
}