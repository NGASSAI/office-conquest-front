'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/auth-store';
import { restoreSession } from '../lib/auth';
import { AUTH_LOGOUT_EVENT } from '../lib/api';

// Routes accessibles sans compte (mode invité inscrit non requis pour les consulter)
const PUBLIC_ROUTES = ['/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, status } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    restoreSession().then((user) => setUser(user));
  }, [setUser]);

  useEffect(() => {
    // Réagit à une déconnexion déclenchée ailleurs (refresh expiré, compte bloqué en cours de session...)
    function handleLogout() {
      setUser(null);
      if (!PUBLIC_ROUTES.includes(pathname)) {
        router.push('/login');
      }
    }
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
  }, [pathname, router, setUser]);

  // Évite un flash "invité" pendant la vérification silencieuse de la session au premier chargement
  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </div>
    );
  }

  return <>{children}</>;
}