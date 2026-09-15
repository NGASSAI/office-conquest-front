import axios from 'axios';

// Instance axios avec cookie httpOnly envoyé automatiquement (remember me)
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// Stocke l'access token en mémoire (pas en localStorage, plus sûr)
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => { accessToken = token; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Si l'access token expire, on tente un refresh silencieux via le cookie
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        error.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(error.config);
      } catch {
        setAccessToken(null);
        // TODO: rediriger vers /login uniquement si l'action nécessitait une session
      }
    }
    return Promise.reject(error);
  },
);
