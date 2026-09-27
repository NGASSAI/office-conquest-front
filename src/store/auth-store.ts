import { create } from 'zustand';

export interface AuthUser {
  id: string;
  pseudo: string;
  email: string;
  role: 'USER' | 'ADMIN';
  teamId: string | null;
  avatar?: string | null;
}

type AuthStatus = 'checking' | 'authenticated' | 'guest';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthStatus) => void;
}

// État global léger — la vraie source de vérité reste le cookie httpOnly côté serveur.
// "checking" pendant le refresh silencieux au chargement évite un flash de contenu "déconnecté".
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'checking',
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'guest' }),
  setStatus: (status) => set({ status }),
}));