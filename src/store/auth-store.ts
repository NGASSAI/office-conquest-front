import { create } from 'zustand';

interface AuthState {
  user: { id: string; pseudo: string; role: string } | null;
  setUser: (user: AuthState['user']) => void;
}

// État global léger — la vraie source de vérité reste le cookie côté serveur
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
